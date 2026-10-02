import { getFinanceSnapshot } from "@/features/finance/services/finance-store";
import { getEgyptNowIso } from "@/lib/egypt-time";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";
import { SHIFT_FIXTURES } from "../fixtures";
import { validateCloseShift, validateOpenShift } from "../schemas/shift-schema";
import type { CloseShiftInput, FinancialShift, OpenShiftInput, ShiftCollectionSummary } from "../types";

const STORAGE_KEY = "l3bty-local-shifts-v1";
const STORAGE_VERSION = 1;
const stored = readLocalTestData<{ shifts: FinancialShift[]; sequence: number; processed: [string, string][] }>(STORAGE_KEY, STORAGE_VERSION, { shifts: [], sequence: 100, processed: [] });
let shifts: readonly FinancialShift[] = stored.shifts.map(clone);
let sequence = stored.sequence;
let processed = new Map<string, string>(stored.processed);
let snapshot = { shifts };
const listeners = new Set<() => void>();

function clone(item: FinancialShift): FinancialShift { return { ...item, collectionSummary: { ...item.collectionSummary }, differenceReview: item.differenceReview ? { ...item.differenceReview } : null, events: item.events.map((event) => ({ ...event })) }; }
function emit() { snapshot = { shifts }; writeLocalTestData(STORAGE_KEY, STORAGE_VERSION, { shifts, sequence, processed: [...processed.entries()] }); listeners.forEach((listener) => listener()); }
export function subscribeShiftStore(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getShiftSnapshot() { return snapshot; }
export function getOpenShift(employeeId: string, cashboxId?: string) { return shifts.find((item) => item.employeeId === employeeId && item.status === "open" && (!cashboxId || item.cashboxId === cashboxId)); }
export function findOpenShiftForBranch(items: readonly FinancialShift[], branchId: string) { return items.find((item) => item.branchId === branchId && item.status === "open"); }
export function getOpenShiftForBranch(branchId: string) { return findOpenShiftForBranch(shifts, branchId); }

function calculate(shift: FinancialShift) {
  const payments = getFinanceSnapshot().payments.filter((item) => item.shiftId === shift.id && item.status === "completed");
  const incoming = payments.filter((item) => item.direction === "incoming");
  const outgoing = payments.filter((item) => item.direction === "outgoing");
  const method = (value: "cash" | "card" | "electronic_wallet", direction: "incoming" | "outgoing") => payments.filter((item) => item.direction === direction).flatMap((item) => item.parts).filter((part) => part.method === value).reduce((sum, part) => sum + part.amount, 0);
  const summary: ShiftCollectionSummary = {
    salesAmount: incoming.filter((item) => item.sourceType === "sale").reduce((sum, item) => sum + item.amount, 0),
    rentalAmount: incoming.filter((item) => item.sourceType === "rental").reduce((sum, item) => sum + item.amount, 0),
    maintenanceAmount: incoming.filter((item) => item.sourceType === "maintenance").reduce((sum, item) => sum + item.amount, 0),
    otherReceiptAmount: incoming.filter((item) => !["sale", "rental", "maintenance"].includes(item.sourceType)).reduce((sum, item) => sum + item.amount, 0),
    refundsAmount: outgoing.filter((item) => item.sourceType === "refund").reduce((sum, item) => sum + item.amount, 0),
  };
  return { expectedCash: shift.openingBalance + method("cash", "incoming") - method("cash", "outgoing"), expectedCard: method("card", "incoming") - method("card", "outgoing"), expectedWallet: method("electronic_wallet", "incoming") - method("electronic_wallet", "outgoing"), totalCollections: incoming.reduce((sum, item) => sum + item.amount, 0), totalRefunds: summary.refundsAmount, totalOutgoing: outgoing.reduce((sum, item) => sum + item.amount, 0), summary };
}

export function getShiftClosingTotals(shiftId: string) {
  const shift = shifts.find((item) => item.id === shiftId && item.status === "open");
  return shift ? calculate(shift) : null;
}

export function openShift(input: OpenShiftInput) {
  const duplicateId = processed.get(input.idempotencyKey);
  const duplicateShift = duplicateId ? shifts.find((item) => item.id === duplicateId) : undefined;
  if (duplicateShift?.status === "open") return { valid: true, message: "الوردية مفتوحة بالفعل.", shift: duplicateShift, duplicate: true };
  const validation = validateOpenShift(input);
  if (!validation.valid) return validation;
  const cashbox = getFinanceSnapshot().cashboxes.find((item) => item.id === input.cashboxId);
  if (!cashbox || cashbox.branchId !== input.branchId || cashbox.status !== "active" || !cashbox.assignedEmployeeIds.includes(input.employeeId)) return { valid: false, message: "الخزنة غير متاحة لهذا الموظف أو الفرع." };
  if (getOpenShift(input.employeeId, input.cashboxId)) return { valid: false, message: "توجد وردية مفتوحة بالفعل لنفس الموظف والخزنة." };
  const now = getEgyptNowIso();
  const id = `shift-${sequence++}`;
  const shift: FinancialShift = { id, shiftNumber: `SHF-${now.slice(0, 4)}-${String(sequence).padStart(5, "0")}`, employeeId: input.employeeId, branchId: input.branchId, cashboxId: input.cashboxId, openedAt: now, openingBalance: input.openingBalance, closedAt: null, expectedCash: input.openingBalance, countedCash: null, cashDifference: 0, expectedCard: 0, countedCard: null, cardDifference: 0, expectedWallet: 0, countedWallet: null, walletDifference: 0, totalCollections: 0, totalRefunds: 0, totalOutgoing: 0, status: "open", openingNote: input.openingNote, closingNote: "", closedByEmployeeId: null, forcedCloseReason: "", collectionSummary: { salesAmount: 0, rentalAmount: 0, maintenanceAmount: 0, otherReceiptAmount: 0, refundsAmount: 0 }, differenceReview: null, events: [{ id: `shift-event-${sequence++}`, type: "opened", at: now, byEmployeeId: input.employeeId, reason: input.openingNote || "فتح وردية" }], createdAt: now, updatedAt: now };
  shifts = [shift, ...shifts];
  processed.set(input.idempotencyKey, id);
  emit();
  return { valid: true, message: "تم فتح الوردية.", shift, duplicate: false };
}

export function closeShift(input: CloseShiftInput) {
  if (processed.has(input.idempotencyKey)) return { valid: true, message: "تم تسجيل الإغلاق سابقًا.", shift: shifts.find((item) => item.id === processed.get(input.idempotencyKey)) };
  const validation = validateCloseShift(input);
  if (!validation.valid) return validation;
  const shift = shifts.find((item) => item.id === input.shiftId);
  if (!shift || shift.status !== "open") return { valid: false, message: "الوردية غير قابلة للإغلاق." };
  if (shift.employeeId !== input.employeeId) return { valid: false, message: "لا يمكن للموظف إغلاق وردية موظف آخر." };
  const totals = calculate(shift);
  const cashDifference = input.countedCash - totals.expectedCash;
  const cardDifference = input.countedCard - totals.expectedCard;
  const walletDifference = input.countedWallet - totals.expectedWallet;
  const hasDifference = [cashDifference, cardDifference, walletDifference].some((value) => Math.abs(value) > .01);
  if (hasDifference && !input.differenceReason.trim()) return { valid: false, message: "سبب فرق الوردية إلزامي." };
  const now = getEgyptNowIso();
  let updated: FinancialShift | undefined;
  shifts = shifts.map((item) => {
    if (item.id !== shift.id) return item;
    updated = { ...item, ...totals, collectionSummary: totals.summary, countedCash: input.countedCash, countedCard: input.countedCard, countedWallet: input.countedWallet, cashDifference, cardDifference, walletDifference, status: hasDifference ? "closing_review" : "closed", closedAt: now, closingNote: input.closingNote, closedByEmployeeId: input.employeeId, differenceReview: hasDifference ? { status: "pending", reason: input.differenceReason, decisionReason: "", reviewedByEmployeeId: null, reviewedAt: null } : null, events: [{ id: `shift-event-${sequence++}`, type: hasDifference ? "difference_recorded" : "closed", at: now, byEmployeeId: input.employeeId, reason: input.differenceReason || input.closingNote }, ...item.events], updatedAt: now };
    return updated;
  });
  processed.set(input.idempotencyKey, shift.id);
  emit();
  return { valid: true, message: hasDifference ? "تم إرسال فرق الوردية للمراجعة." : "تم إغلاق الوردية دون فروقات.", shift: updated };
}

export function reviewShiftDifference(id: string, actor: string, decision: "accepted" | "rejected" | "needs_information", reason: string) {
  const shift = shifts.find((item) => item.id === id);
  if (!shift || shift.status !== "closing_review" || !shift.differenceReview) return { valid: false, message: "لا يوجد فرق قيد المراجعة." };
  if (!reason.trim()) return { valid: false, message: "سبب القرار إلزامي." };
  const now = getEgyptNowIso();
  shifts = shifts.map((item) => item.id === id ? { ...item, status: decision === "accepted" ? "closed" : "closing_review", differenceReview: { ...item.differenceReview!, status: decision, decisionReason: reason, reviewedByEmployeeId: actor, reviewedAt: now }, events: [{ id: `shift-event-${sequence++}`, type: `review_${decision}`, at: now, byEmployeeId: actor, reason }, ...item.events], updatedAt: now } : item);
  emit();
  return { valid: true, message: "تم حفظ قرار مراجعة الفرق." };
}

export function forceCloseShift(id: string, actor: string, reason: string) {
  const shift = shifts.find((item) => item.id === id);
  if (!shift || !["open", "closing_review"].includes(shift.status) || reason.trim().length < 5) return { valid: false, message: "الوردية أو سبب الإغلاق الإداري غير صالح." };
  const now = getEgyptNowIso();
  shifts = shifts.map((item) => item.id === id ? { ...item, status: "force_closed", closedAt: now, closedByEmployeeId: actor, forcedCloseReason: reason, events: [{ id: `shift-event-${sequence++}`, type: "force_closed", at: now, byEmployeeId: actor, reason }, ...item.events], updatedAt: now } : item);
  emit();
  return { valid: true, message: "تم الإغلاق الإداري مع حفظ السبب." };
}

export function resetShiftStore() { shifts = SHIFT_FIXTURES.map(clone); sequence = 100; processed = new Map(); removeLocalTestData(STORAGE_KEY); snapshot = { shifts }; listeners.forEach((listener) => listener()); }
