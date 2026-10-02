import { beforeEach, describe, expect, it } from "vitest";
import { resetFinanceStore } from "@/features/finance/services/finance-store";
import { getNotificationsSnapshot, resetNotificationStore } from "@/features/notifications/services/notification-service";
import { toCents } from "@/lib/utils/money";
import { isPayrollAdmin } from "../permissions";
import { getCurrentPayrollPeriod } from "../services/payroll-period";
import { calculatePayrollLine, createPayrollRun, getPayrollSnapshot, payPayrollLine, requestAdvance, resetPayrollStore, reviewAdvance, saveSalaryProfile, transitionPayrollRun } from "../services/payroll-store";

describe("payroll", () => {
  beforeEach(() => { resetFinanceStore(); resetNotificationStore(); resetPayrollStore(); });
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
  it("selects the current pay period automatically from the salary type", () => {
    const today = new Date(2026, 7, 17);
    expect(getCurrentPayrollPeriod("weekly", today)).toEqual({ start: "2026-08-17", end: "2026-08-23" });
    expect(getCurrentPayrollPeriod("monthly", today)).toEqual({ start: "2026-08-01", end: "2026-08-31" });
    expect(getCurrentPayrollPeriod("daily", today)).toEqual({ start: "2026-08-17", end: "2026-08-17" });
  });
  it("supports a weekly salary and calculates its normal hourly overtime rate", () => {
    expect(saveSalaryProfile({ employeeId: "employee-sales", baseSalary: "2100.00", salaryType: "weekly", effectiveFrom: "2026-08-01", active: true, overtimeEnabled: true, overtimeRateType: "normal", allowances: [], defaultDeductions: [], commissionsEnabled: false }).valid).toBe(true);
    const line = calculatePayrollLine("employee-sales", "weekly-test", 60)!;
    expect(line.baseSalary).toBe("2100.00");
    expect(line.overtimeRate).toBe("35.00");
    expect(line.overtimeAmount).toBe("35.00");
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
  it("lets the owner approve a draft directly without sending it to themselves", () => {
    const result = transitionPayrollRun("payroll-draft", "approve", "employee-owner", "اعتماد المالك المباشر لكشف الراتب", "owner");
    expect(result.valid).toBe(true);
    expect(getPayrollSnapshot().runs.find((run) => run.id === "payroll-draft")?.status).toBe("approved");
    expect(getPayrollSnapshot().runs.find((run) => run.id === "payroll-draft")?.approvedByEmployeeId).toBe("employee-owner");
  });
  it("does not let a manager approve a draft directly", () => {
    const result = transitionPayrollRun("payroll-draft", "approve", "employee-manager", "محاولة اعتماد المدير للمسودة مباشرة", "manager");
    expect(result.valid).toBe(false);
    expect(getPayrollSnapshot().runs.find((run) => run.id === "payroll-draft")?.status).toBe("draft");
  });
  it("notifies the owner once when the manager sends a payslip for approval", () => {
    expect(transitionPayrollRun("payroll-draft", "submit", "employee-manager", "إرسال كشف الراتب إلى المالك", "manager").valid).toBe(true);
    const notices = getNotificationsSnapshot().notifications.filter((item) => item.referenceId === "payroll-draft" && item.type === "payroll_approval_requested");
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ recipientUserId: "user-owner", recipientEmployeeId: "employee-owner", status: "unread", deepLink: "/payroll/payroll-draft" });
    expect(transitionPayrollRun("payroll-draft", "approve", "employee-owner", "اعتماد المالك لكشف الراتب", "owner").valid).toBe(true);
    expect(getNotificationsSnapshot().notifications.find((item) => item.id === notices[0].id)?.status).toBe("acted");
  });
  it("prevents creating duplicate draft payslips for the same employee and period", () => {
    const input = { periodStart: "2026-10-05", periodEnd: "2026-10-11", branchId: "branch-2", actorEmployeeId: "employee-manager", employeeId: "employee-sales" };
    expect(createPayrollRun(input).valid).toBe(true);
    const duplicate = createPayrollRun({ ...input, periodStart: "2026-10-01", periodEnd: "2026-10-31" });
    expect(duplicate.valid).toBe(false);
    expect(duplicate.message).toContain("بالفعل");
    expect(getPayrollSnapshot().runs.filter((run) => run.lines.some((line) => line.employeeId === input.employeeId) && run.periodStart.startsWith("2026-10"))).toHaveLength(1);
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
