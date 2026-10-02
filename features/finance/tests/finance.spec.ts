import { beforeEach, describe, expect, it } from "vitest";
import { getShiftSnapshot, resetShiftStore } from "@/features/shifts/services/shift-store";
import { canCollectMoney, canViewFinance } from "../permissions";
import { createVoucher, getFinanceSnapshot, recordPayment, resetFinanceStore, reversePayment } from "../services/finance-store";
import { filterFinanceByBranch } from "../services/finance-view";

describe("finance contracts", () => {
  beforeEach(() => { resetFinanceStore(); resetShiftStore(); });
  it("limits finance administration to owner and manager", () => {
    expect(canViewFinance(["owner"])).toBe(true); expect(canViewFinance(["manager"])).toBe(true);
    expect(canViewFinance(["sales_employee"])).toBe(false); expect(canViewFinance(["rental_maintenance_employee"])).toBe(false);
    expect(canViewFinance(["maintenance_technician"])).toBe(false); expect(canCollectMoney(["maintenance_technician"])).toBe(false);
  });
  it("filters every financial total by the selected branch", () => {
    const finance = getFinanceSnapshot();
    const scoped = filterFinanceByBranch(finance, getShiftSnapshot().shifts, "main");
    expect(scoped.cashboxes.every((item) => item.branchId === "main")).toBe(true);
    expect(scoped.payments.every((item) => item.branchId === "main")).toBe(true);
    expect(scoped.receivables.every((item) => item.branchId === "main")).toBe(true);
    expect(scoped.shifts.every((item) => item.branchId === "main")).toBe(true);
    expect(filterFinanceByBranch(finance, getShiftSnapshot().shifts, "all").payments).toHaveLength(finance.payments.length);
  });
  it("requires an open matching shift for operational collection", () => {
    const base = { branchId: "branch-2", cashboxId: "cash-branch-2", shiftId: null, customerId: "customer-001", sourceType: "sale" as const, sourceId: "sale-test", amount: 100, parts: [{ method: "cash" as const, amount: 100, reference: "" }], employeeId: "employee-sales", roles: ["sales_employee" as const], assignedBranchIds: ["branch-2"], idempotencyKey: "pay-no-shift" };
    expect(recordPayment(base).valid).toBe(false);
    expect(recordPayment({ ...base, shiftId: "shift-sales-open", idempotencyKey: "pay-with-shift" }).valid).toBe(true);
    expect(recordPayment({ ...base, shiftId: "shift-sales-open", branchId: "main", idempotencyKey: "pay-wrong-branch" }).valid).toBe(false);
  });
  it("rejects technician collection and invalid mixed payment", () => {
    const base = { branchId: "main", cashboxId: "cash-main", shiftId: null, customerId: null, sourceType: "administrative" as const, sourceId: "admin", amount: 100, parts: [{ method: "cash" as const, amount: 80, reference: "" }], employeeId: "employee-technician", roles: ["maintenance_technician" as const], assignedBranchIds: ["main"], idempotencyKey: "tech", administrativeReason: "سبب" };
    expect(recordPayment(base).valid).toBe(false);
    expect(recordPayment({ ...base, employeeId: "employee-manager", roles: ["manager"], parts: [{ method: "cash", amount: 80, reference: "" }, { method: "card", amount: 20, reference: "" }], idempotencyKey: "mixed-no-ref" }).valid).toBe(false);
    expect(recordPayment({ ...base, employeeId: "employee-manager", roles: ["manager"], parts: [{ method: "cash", amount: 80, reference: "" }, { method: "card", amount: 20, reference: "CARD-1" }], idempotencyKey: "mixed-ok" }).valid).toBe(true);
  });
  it("uses idempotency and never duplicates payment", () => {
    const input = { branchId: "main", cashboxId: "cash-main", shiftId: null, customerId: null, sourceType: "administrative" as const, sourceId: "admin", amount: 100, parts: [{ method: "cash" as const, amount: 100, reference: "" }], employeeId: "employee-manager", roles: ["manager" as const], assignedBranchIds: ["main"], idempotencyKey: "same-pay", administrativeReason: "تحصيل إداري موثق" };
    recordPayment(input); const count = getFinanceSnapshot().payments.length; recordPayment(input);
    expect(getFinanceSnapshot().payments).toHaveLength(count);
    expect(getFinanceSnapshot().payments.filter((item) => item.idempotencyKey === input.idempotencyKey)).toHaveLength(1);
  });
  it("creates reversal and keeps original", () => {
    const before = getFinanceSnapshot().payments.length; expect(reversePayment("fin-pay-1", "employee-manager", "تصحيح حركة مكررة").valid).toBe(true);
    expect(getFinanceSnapshot().payments).toHaveLength(before + 1); expect(getFinanceSnapshot().payments.find((item) => item.id === "fin-pay-1")?.status).toBe("reversed");
    expect(reversePayment("fin-pay-1", "employee-manager", "محاولة ثانية").valid).toBe(false);
  });
  it("transfers between cashboxes atomically and idempotently", () => {
    const source = getFinanceSnapshot().cashboxes.find((item) => item.id === "cash-main")!.currentBalance;
    const destination = getFinanceSnapshot().cashboxes.find((item) => item.id === "central-cash")!.currentBalance;
    const input = { type: "transfer" as const, branchId: "main", cashboxId: "cash-main", destinationCashboxId: "central-cash", amount: 500, reason: "توريد نقدية موثق", createdBy: "employee-manager", idempotencyKey: "transfer-once" };
    expect(createVoucher(input).valid).toBe(true); expect(createVoucher(input).valid).toBe(true);
    expect(getFinanceSnapshot().cashboxes.find((item) => item.id === "cash-main")?.currentBalance).toBe(source - 500);
    expect(getFinanceSnapshot().cashboxes.find((item) => item.id === "central-cash")?.currentBalance).toBe(destination + 500);
  });
  it("prevents negative balances", () => expect(createVoucher({ type: "payment", branchId: "main", cashboxId: "cash-main", amount: 999999, reason: "صرف إداري كبير", createdBy: "employee-manager", idempotencyKey: "negative" }).valid).toBe(false));
  it("updates partial and full receivable payment", () => {
    const receivable = getFinanceSnapshot().receivables.find((item) => item.id === "recv-sale")!;
    const input = { branchId: "main", cashboxId: "cash-main", shiftId: null, customerId: receivable.customerId, sourceType: "receivable" as const, sourceId: receivable.id, amount: 100, parts: [{ method: "cash" as const, amount: 100, reference: "" }], employeeId: "employee-manager", roles: ["manager" as const], assignedBranchIds: ["main"], idempotencyKey: "recv-part", administrativeReason: "سداد إداري", maximumAmount: receivable.remainingAmount };
    expect(recordPayment(input).valid).toBe(true); expect(getFinanceSnapshot().receivables.find((item) => item.id === receivable.id)?.status).toBe("partially_paid");
    const remaining = getFinanceSnapshot().receivables.find((item) => item.id === receivable.id)!.remainingAmount;
    expect(recordPayment({ ...input, amount: remaining, parts: [{ method: "cash", amount: remaining, reference: "" }], maximumAmount: remaining, idempotencyKey: "recv-full" }).valid).toBe(true);
    expect(getFinanceSnapshot().receivables.find((item) => item.id === receivable.id)?.status).toBe("paid");
  });
});
