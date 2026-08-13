import { beforeEach, describe, expect, it } from "vitest";
import { resetFinanceStore } from "@/features/finance/services/finance-store";
import { toCents } from "@/lib/utils/money";
import { isPayrollAdmin } from "../permissions";
import { calculatePayrollLine, createPayrollRun, getPayrollSnapshot, payPayrollLine, requestAdvance, resetPayrollStore, reviewAdvance, transitionPayrollRun } from "../services/payroll-store";

describe("payroll", () => {
  beforeEach(() => { resetFinanceStore(); resetPayrollStore(); });
  it("keeps payroll administration owner-manager only", () => {
    expect(isPayrollAdmin(["owner"])).toBe(true);
    expect(isPayrollAdmin(["manager"])).toBe(true);
    expect(isPayrollAdmin(["rental_maintenance_employee"])).toBe(false);
    expect(isPayrollAdmin(["maintenance_technician"])).toBe(false);
  });
  it("uses safe cents and normal overtime rate", () => {
    const line = calculatePayrollLine("employee-sales", "test", 60)!;
    expect(line.overtimeRate).toBe("35.42");
    expect(line.overtimeAmount).toBe("35.42");
    expect(line.commissions).toBe("0.00");
    expect(line.attendanceAdjustments).toHaveLength(0);
    expect(toCents(line.netAmount)).toBe(toCents(line.grossAmount) - toCents(line.totalDeductions));
  });
  it("does not automatically deduct attendance or shift differences", () => {
    const line = calculatePayrollLine("employee-rental", "no-auto", 0)!;
    expect(line.approvedDeductions).toHaveLength(0);
    expect(line.note).toContain("لا تُطبق");
    expect(line.note).toContain("فروق الوردية");
  });
  it("requires a salary profile", () => expect(calculatePayrollLine("missing-employee", "missing")).toBeUndefined());
  it("prevents duplicate approved period", () => {
    const first = createPayrollRun({ periodStart: "2026-09-01", periodEnd: "2026-09-30", branchId: "branch-2", actorEmployeeId: "employee-manager" });
    expect(first.valid).toBe(true);
    if (!("run" in first) || !first.run) throw new Error("Expected payroll run");
    expect(transitionPayrollRun(first.run.id, "submit", "employee-manager", "إرسال الدورة للمراجعة").valid).toBe(true);
    expect(transitionPayrollRun(first.run.id, "approve", "employee-owner", "اعتماد الدورة بعد المراجعة").valid).toBe(true);
    expect(createPayrollRun({ periodStart: "2026-09-01", periodEnd: "2026-09-30", branchId: "branch-2", actorEmployeeId: "employee-manager" }).valid).toBe(false);
  });
  it("cannot edit locked or pay before approval", () => {
    expect(transitionPayrollRun("payroll-locked", "recalculate", "employee-manager", "محاولة تعديل دورة مقفلة").valid).toBe(false);
    expect(payPayrollLine("payroll-draft", "line-draft-sales", "cash-branch-2", "employee-manager").valid).toBe(false);
  });
  it("pays an approved salary line only once", () => {
    expect(payPayrollLine("payroll-approved", "line-approved-sales", "cash-branch-2", "employee-manager").valid).toBe(true);
    expect(payPayrollLine("payroll-approved", "line-approved-sales", "cash-branch-2", "employee-manager").valid).toBe(false);
  });
  it("employee can request but cannot administratively approve an advance", () => {
    const result = requestAdvance({ employeeId: "employee-rental", branchId: "main", amount: "1200.00", installmentCount: 3, reason: "طلب شخصي موثق", employeeNote: "", idempotencyKey: "advance-unit", netSalary: "9000.00" });
    expect(result.valid).toBe(true);
    expect(isPayrollAdmin(["rental_maintenance_employee"])).toBe(false);
  });
  it("blocks an installment above net salary without exception", () => {
    expect(reviewAdvance("advance-sales-pending", "employee-manager", "approved", "30000.00", 1, "مراجعة قيمة السلفة الكبيرة").valid).toBe(false);
    expect(getPayrollSnapshot().advances.find((item) => item.id === "advance-sales-pending")?.status).toBe("pending");
  });
});
