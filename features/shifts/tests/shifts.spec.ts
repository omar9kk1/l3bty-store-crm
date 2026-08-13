import { beforeEach, describe, expect, it } from "vitest";
import { resetFinanceStore } from "@/features/finance/services/finance-store";
import { canUseFinancialShift, currentMockEmployeeId, isShiftAdmin } from "../permissions";
import { closeShift, getShiftSnapshot, openShift, resetShiftStore, reviewShiftDifference } from "../services/shift-store";

describe("financial shift contracts", () => {
  beforeEach(() => { resetFinanceStore(); resetShiftStore(); });
  it("enforces role and multi-role rules", () => { expect(isShiftAdmin(["manager"])).toBe(true); expect(canUseFinancialShift(["sales_employee"])).toBe(true); expect(canUseFinancialShift(["rental_maintenance_employee"])).toBe(true); expect(canUseFinancialShift(["maintenance_technician"])).toBe(false); expect(currentMockEmployeeId(["sales_employee", "rental_maintenance_employee"])).toBe("employee-dual"); });
  it("prevents two active shifts for employee and cashbox", () => expect(openShift({ employeeId: "employee-sales", branchId: "branch-2", cashboxId: "cash-branch-2", openingBalance: 100, openingNote: "", assignedBranchIds: ["branch-2"], idempotencyKey: "duplicate-open" }).valid).toBe(false));
  it("rejects unassigned branches and locked cashboxes", () => { expect(openShift({ employeeId: "employee-dual", branchId: "main", cashboxId: "cash-main", openingBalance: 100, openingNote: "", assignedBranchIds: ["branch-2", "branch-3"], idempotencyKey: "bad-branch" }).valid).toBe(false); expect(openShift({ employeeId: "employee-dual", branchId: "branch-3", cashboxId: "cash-branch-3", openingBalance: 100, openingNote: "", assignedBranchIds: ["branch-3"], idempotencyKey: "locked" }).valid).toBe(false); });
  it("closes without difference when values match expected", () => {
    const shift = getShiftSnapshot().shifts.find((item) => item.id === "shift-sales-open")!;
    expect(closeShift({ shiftId: shift.id, employeeId: shift.employeeId, countedCash: 11880, countedCard: 6412.5, countedWallet: 1400, closingNote: "مطابق", differenceReason: "", idempotencyKey: "close-match" }).valid).toBe(true);
    expect(getShiftSnapshot().shifts.find((item) => item.id === shift.id)?.status).toBe("closed");
  });
  it("requires reason and administrative review for differences", () => {
    const shift = getShiftSnapshot().shifts.find((item) => item.id === "shift-rental-open")!;
    expect(closeShift({ shiftId: shift.id, employeeId: shift.employeeId, countedCash: 100, countedCard: 0, countedWallet: 0, closingNote: "", differenceReason: "", idempotencyKey: "diff-invalid" }).valid).toBe(false);
    expect(closeShift({ shiftId: shift.id, employeeId: shift.employeeId, countedCash: 100, countedCard: 0, countedWallet: 0, closingNote: "", differenceReason: "عجز نقدي موثق", idempotencyKey: "diff-valid" }).valid).toBe(true);
    expect(getShiftSnapshot().shifts.find((item) => item.id === shift.id)?.status).toBe("closing_review");
    expect(reviewShiftDifference(shift.id, "employee-manager", "accepted", "اعتماد العجز بعد المراجعة").valid).toBe(true);
    expect(getShiftSnapshot().shifts.find((item) => item.id === shift.id)?.status).toBe("closed");
  });
  it("does not model payroll deduction for difference", () => { const shift = getShiftSnapshot().shifts.find((item) => item.id === "shift-shortage")!; expect(Object.keys(shift)).not.toContain("salaryDeduction"); expect(shift.differenceReview?.status).toBe("pending"); });
});
