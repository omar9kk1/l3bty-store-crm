import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFinanceStore } from "@/features/finance/services/finance-store";
import { canUseFinancialShift, currentMockEmployeeId, isShiftAdmin } from "../permissions";
import { closeShift, findOpenShiftForBranch, getShiftClosingTotals, getShiftSnapshot, openShift, resetShiftStore, reviewShiftDifference } from "../services/shift-store";
import { filterShiftsByBranch, getCashDifference, getFinancialShiftBranches, getShiftDateTimeParts, getShortShiftNumber } from "../components/ShiftsPage";

describe("financial shift contracts", () => {
  beforeEach(() => { resetFinanceStore(); resetShiftStore(); });
  afterEach(() => vi.useRealTimers());
  it("shows a compact four-digit shift number while keeping the stored value unchanged", () => {
    const storedShiftNumber = "SHF-2026-00110";
    expect(getShortShiftNumber(storedShiftNumber)).toBe("0110");
    expect(storedShiftNumber).toBe("SHF-2026-00110");
    expect(getShortShiftNumber("SHF-107")).toBe("107");
  });
  it("finds the live open shift by branch for point of sale", () => {
    expect(findOpenShiftForBranch(getShiftSnapshot().shifts, "branch-2")?.id).toBe("shift-sales-open");
    expect(findOpenShiftForBranch(getShiftSnapshot().shifts, "branch-3")).toBeUndefined();
  });
  it("enforces role and multi-role rules", () => { expect(isShiftAdmin(["manager"])).toBe(true); expect(canUseFinancialShift(["sales_employee"])).toBe(true); expect(canUseFinancialShift(["rental_maintenance_employee"])).toBe(true); expect(canUseFinancialShift(["maintenance_technician"])).toBe(false); expect(currentMockEmployeeId(["sales_employee", "rental_maintenance_employee"])).toBe("employee-dual"); });
  it("prevents two active shifts for employee and cashbox", () => expect(openShift({ employeeId: "employee-sales", branchId: "branch-2", cashboxId: "cash-branch-2", openingBalance: 100, openingNote: "", assignedBranchIds: ["branch-2"], idempotencyKey: "duplicate-open" }).valid).toBe(false));
  it("allows a new shift with the same employee and cashbox after the previous shift closes", () => {
    const input = { employeeId: "employee-manager", branchId: "workshop", cashboxId: "cash-workshop", openingBalance: 500, openingNote: "", assignedBranchIds: ["workshop"], idempotencyKey: "reusable-open" };
    const first = openShift(input);
    expect(first.valid).toBe(true);
    if (!("shift" in first)) throw new Error("Expected the first shift to open");

    const repeatedWhileOpen = openShift(input);
    if (!("shift" in repeatedWhileOpen)) throw new Error("Expected the repeated request to return the open shift");
    expect(repeatedWhileOpen.shift?.id).toBe(first.shift?.id);

    const totals = getShiftClosingTotals(first.shift!.id)!;
    expect(closeShift({ shiftId: first.shift!.id, employeeId: input.employeeId, countedCash: totals.expectedCash, countedCard: totals.expectedCard, countedWallet: totals.expectedWallet, closingNote: "", differenceReason: "", idempotencyKey: "close-reusable-open" }).valid).toBe(true);

    const reopened = openShift(input);
    expect(reopened.valid).toBe(true);
    if (!("shift" in reopened)) throw new Error("Expected a new shift after the previous shift closed");
    expect(reopened.shift?.status).toBe("open");
    expect(reopened.shift?.id).not.toBe(first.shift?.id);
  });
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
  it("records newly opened shifts using the actual Egypt date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T19:15:00.000Z"));
    const result = openShift({ employeeId: "employee-manager", branchId: "workshop", cashboxId: "cash-workshop", openingBalance: 500, openingNote: "", assignedBranchIds: ["workshop"], idempotencyKey: "current-egypt-time" });
    expect(result.valid).toBe(true);
    expect(getShiftSnapshot().shifts[0].openedAt).toBe("2026-08-18T22:15:00+03:00");
  });
  it("uses the recorded electronic payments without asking the employee to recount them", () => {
    const shift = getShiftSnapshot().shifts.find((item) => item.id === "shift-sales-open")!;
    const totals = getShiftClosingTotals(shift.id)!;
    expect(totals.expectedCard).toBe(6412.5);
    expect(totals.expectedWallet).toBe(1400);
  });
  it("explains the counted cash difference before closing", () => {
    expect(getCashDifference(5000, "")).toBeNull();
    expect(getCashDifference(5000, "5000")).toEqual({ amount: 0, type: "matched" });
    expect(getCashDifference(5000, "4800")).toEqual({ amount: -200, type: "shortage" });
    expect(getCashDifference(5000, "5200")).toEqual({ amount: 200, type: "surplus" });
  });
  it("filters the shift summary and list by the selected branch", () => {
    const shifts = [
      { id: "shift-main", branchId: "branch-1" },
      { id: "shift-second", branchId: "branch-2" },
    ];
    expect(filterShiftsByBranch(shifts, "all")).toEqual(shifts);
    expect(filterShiftsByBranch(shifts, "branch-2")).toEqual([shifts[1]]);
    expect(filterShiftsByBranch(shifts, "missing-branch")).toEqual([]);
  });
  it("excludes central workshops from financial shifts", () => {
    const branches = [
      { id: "all", nameAr: "كل الفروع", code: "ALL" },
      { id: "branch-1", nameAr: "مول غازي", code: "BR01", type: "branch" as const },
      { id: "workshop", nameAr: "الورشة المركزية", code: "BR02", type: "central_workshop" as const },
    ];
    expect(getFinancialShiftBranches(branches)).toEqual([branches[1]]);
  });
  it("formats opening and closing timestamps and keeps an open shift empty", () => {
    expect(getShiftDateTimeParts(null)).toBeNull();
    expect(getShiftDateTimeParts("2026-08-27T18:03:00+03:00")).toMatchObject({ date: expect.stringContaining("2026"), time: expect.stringMatching(/6:03|18:03/) });
  });
});
