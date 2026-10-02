import { beforeEach, describe, expect, it } from "vitest";
import { getFinanceSnapshot, resetFinanceStore } from "@/features/finance/services/finance-store";
import { isExpenseAdmin } from "../permissions";
import {
  getExpenseSnapshot,
  payExpense,
  resetExpenseStore,
  reverseExpense,
  reviewExpense,
  submitExpenseRequest,
} from "../services/expense-store";

describe("expenses", () => {
  beforeEach(() => {
    resetFinanceStore();
    resetExpenseStore();
  });

  it("keeps administration owner-manager only", () => {
    expect(isExpenseAdmin(["owner"])).toBe(true);
    expect(isExpenseAdmin(["manager"])).toBe(true);
    expect(isExpenseAdmin(["sales_employee"])).toBe(false);
    expect(isExpenseAdmin(["maintenance_technician"])).toBe(false);
  });

  it("validates amount and assigned branch", () => {
    const base = {
      branchId: "branch-2",
      categoryId: "custom:شحن",
      categoryName: "شحن",
      amount: "0",
      expenseDate: "2026-08-21",
      description: "شحن طلب",
      businessPurpose: "شحن طلب",
      paidPersonally: false,
      reimbursementRequested: false,
      requestedByEmployeeId: "employee-sales",
      assignedBranchIds: ["branch-2"],
      idempotencyKey: "expense-test",
    };
    expect(submitExpenseRequest(base).valid).toBe(false);
    expect(submitExpenseRequest({ ...base, amount: "250.00", branchId: "workshop" }).valid).toBe(false);
  });

  it("creates a general expense with a manually entered type", () => {
    const result = submitExpenseRequest({
      branchId: "general",
      categoryId: "custom:تسويق",
      categoryName: "تسويق",
      amount: "500.00",
      expenseDate: "2026-08-21",
      description: "إعلان عام للمكان",
      businessPurpose: "إعلان عام للمكان",
      paidPersonally: false,
      reimbursementRequested: false,
      requestedByEmployeeId: "employee-manager",
      assignedBranchIds: ["general", "main"],
      idempotencyKey: "general-expense-unit",
    });

    expect(result.valid).toBe(true);
    expect(getExpenseSnapshot().expenses[0]).toMatchObject({
      branchId: "general",
      categoryName: "تسويق",
      amount: "500.00",
      status: "approved",
      approvalStatus: "approved",
    });
  });

  it("pays a general expense from the selected active cashbox", () => {
    submitExpenseRequest({
      branchId: "general",
      categoryId: "custom:تسويق",
      categoryName: "تسويق",
      amount: "500.00",
      expenseDate: "2026-08-21",
      description: "إعلان عام للمكان",
      businessPurpose: "إعلان عام للمكان",
      paidPersonally: false,
      reimbursementRequested: false,
      requestedByEmployeeId: "employee-manager",
      assignedBranchIds: ["general", "main"],
      idempotencyKey: "general-expense-pay-unit",
    });
    expect(payExpense("general-expense-pay-unit", "cash-main", "employee-owner", "general-payment-unit").valid).toBe(true);
    expect(getFinanceSnapshot().payments.find((item) => item.idempotencyKey === "general-payment-unit")?.branchId).toBe("main");
  });

  it("creates no cash movement until a cashbox is selected for payment", () => {
    const before = getFinanceSnapshot().payments.length;
    const result = submitExpenseRequest({
      branchId: "branch-2",
      categoryId: "custom:شحن",
      categoryName: "شحن",
      amount: "250.00",
      expenseDate: "2026-08-21",
      description: "شحن طلب",
      businessPurpose: "شحن طلب",
      paidPersonally: false,
      reimbursementRequested: false,
      requestedByEmployeeId: "employee-sales",
      assignedBranchIds: ["branch-2"],
      idempotencyKey: "expense-request-unit",
    });
    expect(result.valid).toBe(true);
    expect(getFinanceSnapshot().payments).toHaveLength(before);
  });

  it("approves then pays exactly once", () => {
    expect(reviewExpense("expense-pending", "employee-manager", "approved", "اعتماد بعد مراجعة الفاتورة").valid).toBe(true);
    const first = payExpense("expense-pending", "cash-main", "employee-manager", "pay-expense-unit");
    expect(first.valid).toBe(true);
    expect(payExpense("expense-pending", "cash-main", "employee-manager", "pay-expense-unit").valid).toBe(false);
    expect(getExpenseSnapshot().expenses.find((item) => item.id === "expense-pending")?.paidStatus).toBe("paid");
  });

  it("reversal appends a finance movement and preserves original", () => {
    reviewExpense("expense-pending", "employee-manager", "approved", "اعتماد بعد مراجعة المستند");
    payExpense("expense-pending", "cash-main", "employee-manager", "pay-expense-reverse");
    const count = getFinanceSnapshot().payments.length;
    expect(reverseExpense("expense-pending", "employee-manager", "عكس موثق بسبب تكرار الصرف").valid).toBe(true);
    expect(getFinanceSnapshot().payments).toHaveLength(count + 1);
    expect(getFinanceSnapshot().payments.find((item) => item.idempotencyKey === "pay-expense-reverse")?.status).toBe("reversed");
  });
});
