import { getFinanceSnapshot, recordOutgoingPayment, reversePayment } from "@/features/finance/services/finance-store";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";
import { moneyNumber } from "@/lib/utils/money";
import { EXPENSE_CATEGORY_FIXTURES, EXPENSE_FIXTURES } from "../fixtures";
import { validateExpenseRequest } from "../schemas/expense-schema";
import type { Expense, ExpenseRequestInput, ExpenseSnapshot } from "../types";

const NOW = "2026-08-06T20:00:00+03:00";
const STORAGE_KEY = "l3bty-local-expenses-v1";
const stored = readLocalTestData<{
  expenses: Expense[];
  audits: ExpenseSnapshot["audits"];
  notifications: ExpenseSnapshot["notifications"];
  sequence: number;
}>(STORAGE_KEY, 1, { expenses: [], audits: [], notifications: [], sequence: 100 });

const pendingStatuses = new Set(["submitted", "pending_approval", "needs_information"]);
let expenses: readonly Expense[] = stored.expenses.map((item) => {
  const copy = clone(item);
  return pendingStatuses.has(copy.status)
    ? { ...copy, status: "approved", approvalStatus: "approved", approvedByEmployeeId: copy.requestedByEmployeeId, approvedAt: copy.createdAt }
    : copy;
});
let audits = stored.audits;
let notifications = stored.notifications;
let sequence = stored.sequence;
let snapshot: ExpenseSnapshot = { expenses, categories: EXPENSE_CATEGORY_FIXTURES, audits, notifications };
const listeners = new Set<() => void>();

function clone(item: Expense): Expense {
  return { ...item, attachments: item.attachments.map((attachment) => ({ ...attachment })) };
}

function emit(persist = true) {
  snapshot = { expenses, categories: EXPENSE_CATEGORY_FIXTURES, audits, notifications };
  if (persist) writeLocalTestData(STORAGE_KEY, 1, { expenses, audits, notifications, sequence });
  listeners.forEach((listener) => listener());
}

function audit(expenseId: string, action: string, actorEmployeeId: string, reason: string, previousValue = "", newValue = "") {
  audits = [{ id: `expense-audit-${sequence++}`, expenseId, action, actorEmployeeId, reason, previousValue, newValue, at: NOW }, ...audits];
}

function notify(employeeId: string | null, title: string, href: string) {
  notifications = [{ id: `expense-note-${sequence++}`, employeeId, title, href, at: NOW }, ...notifications];
}

export function subscribeExpenseStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getExpenseSnapshot() {
  return snapshot;
}

export function submitExpenseRequest(input: ExpenseRequestInput) {
  const existing = expenses.find((item) => item.id === input.idempotencyKey);
  if (existing) return { valid: true, message: "تم استخدام الطلب السابق.", expense: existing, duplicate: true };

  const validation = validateExpenseRequest(input, EXPENSE_CATEGORY_FIXTURES);
  if (!validation.valid) return validation;

  const fixtureCategory = EXPENSE_CATEGORY_FIXTURES.find((item) => item.id === input.categoryId);
  const categoryId = fixtureCategory?.id ?? input.categoryId;
  const categoryName = fixtureCategory?.name ?? input.categoryName!.trim();
  const id = input.idempotencyKey || `expense-${sequence++}`;
  const expense: Expense = {
    id,
    expenseNumber: `EXP-2026-${String(sequence++).padStart(4, "0")}`,
    branchId: input.branchId,
    categoryId,
    categoryName,
    requestedByEmployeeId: input.requestedByEmployeeId,
    approvedByEmployeeId: input.requestedByEmployeeId,
    cashboxId: null,
    amount: Number(input.amount).toFixed(2),
    currency: "EGP",
    expenseDate: input.expenseDate,
    description: input.description.trim(),
    businessPurpose: input.businessPurpose.trim(),
    attachments: input.attachmentName
      ? [{ id: `attachment-${sequence++}`, name: input.attachmentName, mockReference: `mock://expense/${id}` }]
      : [],
    status: "approved",
    approvalStatus: "approved",
    paidStatus: "unpaid",
    paymentId: null,
    rejectionReason: "",
    cancellationReason: "",
    paidPersonally: input.paidPersonally,
    reimbursementRequested: input.reimbursementRequested,
    createdAt: NOW,
    updatedAt: NOW,
    approvedAt: NOW,
    paidAt: null,
  };

  expenses = [expense, ...expenses];
  audit(id, "created", input.requestedByEmployeeId, "تسجيل المصروف مباشرة");
  emit();
  return { valid: true, message: "تم تسجيل المصروف بنجاح.", expense, duplicate: false };
}

export function reviewExpense(
  id: string,
  actor: string,
  decision: "approved" | "rejected" | "needs_information",
  reason: string,
  changes?: { amount?: string; categoryId?: string },
) {
  if (reason.trim().length < 5) return { valid: false, message: "سبب القرار إلزامي." };
  const current = expenses.find((item) => item.id === id);
  if (!current || !["submitted", "pending_approval", "needs_information", "approved"].includes(current.status)) {
    return { valid: false, message: "الطلب غير متاح للمراجعة." };
  }

  const category = changes?.categoryId ? EXPENSE_CATEGORY_FIXTURES.find((item) => item.id === changes.categoryId) : undefined;
  const nextAmount = changes?.amount ? Number(changes.amount).toFixed(2) : current.amount;
  if (moneyNumber(nextAmount) <= 0) return { valid: false, message: "المبلغ يجب أن يكون أكبر من صفر." };

  expenses = expenses.map((item) => item.id === id ? {
    ...item,
    amount: nextAmount,
    categoryId: category?.id ?? item.categoryId,
    categoryName: category?.name ?? item.categoryName,
    status: decision,
    approvalStatus: decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "pending",
    approvedByEmployeeId: actor,
    approvedAt: decision === "approved" ? NOW : item.approvedAt,
    rejectionReason: decision === "rejected" ? reason : "",
    updatedAt: NOW,
  } : item);
  audit(id, `review_${decision}`, actor, reason, `${current.amount} · ${current.categoryName}`, `${nextAmount} · ${category?.name ?? current.categoryName}`);
  notify(current.requestedByEmployeeId, `تحديث طلب المصروف ${current.expenseNumber}`, "/my-expenses");
  emit();
  return { valid: true, message: "تم حفظ قرار المصروف في السجل." };
}

export function payExpense(id: string, cashboxId: string, actor: string, idempotencyKey: string) {
  const current = expenses.find((item) => item.id === id);
  if (!current || current.status !== "approved" || current.paidStatus !== "unpaid") {
    return { valid: false, message: "المصروف غير جاهز للدفع أو دُفع سابقًا." };
  }

  const cashbox = getFinanceSnapshot().cashboxes.find((item) => item.id === cashboxId && item.status === "active");
  if (!cashbox || (current.branchId !== "general" && cashbox.branchId !== current.branchId)) {
    return { valid: false, message: "اختر خزنة نشطة مناسبة للمصروف." };
  }

  const paid = recordOutgoingPayment({
    branchId: current.branchId === "general" ? cashbox.branchId : current.branchId,
    cashboxId,
    sourceType: "expense",
    sourceId: current.id,
    amount: moneyNumber(current.amount),
    employeeId: current.requestedByEmployeeId,
    actorEmployeeId: actor,
    reason: `دفع المصروف ${current.expenseNumber}`,
    idempotencyKey,
  });
  if (!paid.valid || !("payment" in paid)) return paid;

  expenses = expenses.map((item) => item.id === id ? {
    ...item,
    status: "paid",
    paidStatus: "paid",
    cashboxId,
    paymentId: paid.payment.id,
    paidAt: NOW,
    updatedAt: NOW,
  } : item);
  audit(id, "paid", actor, "دفع المصروف من خزنة معتمدة");
  notify(current.requestedByEmployeeId, `تم دفع المصروف ${current.expenseNumber}`, "/my-expenses");
  emit();
  return { valid: true, message: "تم دفع المصروف وربطه بحركة خزينة.", expense: expenses.find((item) => item.id === id) };
}

export function cancelExpense(id: string, actor: string, reason: string) {
  const current = expenses.find((item) => item.id === id);
  if (!current || reason.trim().length < 5) return { valid: false, message: "المصروف أو سبب الإلغاء غير صحيح." };
  if (current.status === "paid") return { valid: false, message: "استخدم الحركة العكسية للمصروف المدفوع." };
  expenses = expenses.map((item) => item.id === id ? { ...item, status: "cancelled", cancellationReason: reason, updatedAt: NOW } : item);
  audit(id, "cancelled", actor, reason);
  emit();
  return { valid: true, message: "تم إلغاء المصروف دون حذفه." };
}

export function reverseExpense(id: string, actor: string, reason: string) {
  const current = expenses.find((item) => item.id === id);
  if (!current?.paymentId) return { valid: false, message: "لا توجد حركة دفع لعكسها." };
  const result = reversePayment(current.paymentId, actor, reason);
  if (!result.valid) return result;
  expenses = expenses.map((item) => item.id === id ? { ...item, status: "reversed", paidStatus: "reversed", cancellationReason: reason, updatedAt: NOW } : item);
  audit(id, "reversed", actor, reason);
  emit();
  return { valid: true, message: "تم إنشاء حركة عكسية وبقي الأصل محفوظًا." };
}

export function resetExpenseStore() {
  expenses = EXPENSE_FIXTURES.map(clone);
  audits = [];
  notifications = [];
  sequence = 100;
  removeLocalTestData(STORAGE_KEY);
  emit(false);
}
