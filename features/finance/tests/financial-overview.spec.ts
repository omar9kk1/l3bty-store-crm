import { describe, expect, it } from "vitest";
import type { ExpenseSnapshot } from "@/features/expenses/types";
import type { PayrollSnapshot } from "@/features/payroll/types";
import type { FinanceSnapshot } from "../types";
import { buildFinancialOverview, getFinancialPeriodRange } from "../services/financial-overview";

const finance = {
  cashboxes: [{ id: "cash-1", code: "C1", name: "خزينة", branchId: "branch-1", type: "branch_cash", status: "active", currentBalance: 700, currency: "EGP", assignedEmployeeIds: [], allowNegativeBalance: false, createdAt: "2026-08-01", updatedAt: "2026-08-20" }],
  payments: [
    { id: "in-1", paymentNumber: "P1", branchId: "branch-1", cashboxId: "cash-1", shiftId: null, customerId: null, sourceType: "rental", sourceId: "r1", direction: "incoming", method: "cash", parts: [], amount: 1000, currency: "EGP", reference: "", receivedByEmployeeId: "e1", status: "completed", paidAt: "2026-08-20T10:00:00Z", reversedPaymentId: null, idempotencyKey: "in-1", administrativeReason: "", createdAt: "2026-08-20T10:00:00Z" },
    { id: "advance-1", paymentNumber: "P2", branchId: "branch-1", cashboxId: "cash-1", shiftId: null, customerId: null, sourceType: "advance", sourceId: "a1", direction: "outgoing", method: "cash", parts: [], amount: 50, currency: "EGP", reference: "", receivedByEmployeeId: "e1", status: "completed", paidAt: "2026-08-20T11:00:00Z", reversedPaymentId: null, idempotencyKey: "out-1", administrativeReason: "", createdAt: "2026-08-20T11:00:00Z" },
    { id: "legacy-expense", paymentNumber: "P3", branchId: "branch-1", cashboxId: "cash-1", shiftId: null, customerId: null, sourceType: "expense", sourceId: "e1", direction: "outgoing", method: "cash", parts: [], amount: 200, currency: "EGP", reference: "", receivedByEmployeeId: "e1", status: "completed", paidAt: "2026-08-20T12:00:00Z", reversedPaymentId: null, idempotencyKey: "out-2", administrativeReason: "", createdAt: "2026-08-20T12:00:00Z" },
  ], vouchers: [], receivables: [], audits: [], notifications: [],
} satisfies FinanceSnapshot;

const expenses = {
  expenses: [{ id: "e1", expenseNumber: "E1", branchId: "branch-1", categoryId: "c1", categoryName: "إيجار", requestedByEmployeeId: "m1", approvedByEmployeeId: "m1", cashboxId: null, amount: "200.00", currency: "EGP", expenseDate: "2026-08-20", description: "مصروف", businessPurpose: "مصروف", attachments: [], status: "approved", approvalStatus: "approved", paidStatus: "unpaid", paymentId: null, rejectionReason: "", cancellationReason: "", paidPersonally: false, reimbursementRequested: false, createdAt: "2026-08-20T09:00:00Z", updatedAt: "2026-08-20T09:00:00Z", approvedAt: "2026-08-20T09:00:00Z", paidAt: null }],
  categories: [], audits: [], notifications: [],
} satisfies ExpenseSnapshot;

const payroll = {
  runs: [{ id: "run-1", payrollNumber: "R1", periodStart: "2026-08-14", periodEnd: "2026-08-20", branchId: "branch-1", status: "partially_paid", employeeCount: 2, grossTotal: "500.00", deductionsTotal: "0.00", advancesTotal: "0.00", overtimeTotal: "0.00", netTotal: "500.00", createdByEmployeeId: "m1", approvedByEmployeeId: "o1", createdAt: "2026-08-20", approvedAt: "2026-08-20", paidAt: null, lockedAt: null, timeline: [], lines: [
    { id: "l1", payrollRunId: "run-1", employeeId: "e1", baseSalary: "300.00", overtimeMinutes: 0, overtimeRate: "0.00", overtimeAmount: "0.00", attendanceAdjustments: [], approvedDeductions: [], allowances: [], commissions: "0.00", advancesDeducted: "0.00", grossAmount: "300.00", totalDeductions: "0.00", netAmount: "300.00", status: "paid", note: "", paymentId: "p1" },
    { id: "l2", payrollRunId: "run-1", employeeId: "e2", baseSalary: "200.00", overtimeMinutes: 0, overtimeRate: "0.00", overtimeAmount: "0.00", attendanceAdjustments: [], approvedDeductions: [], allowances: [], commissions: "0.00", advancesDeducted: "0.00", grossAmount: "200.00", totalDeductions: "0.00", netAmount: "200.00", status: "approved", note: "", paymentId: null },
  ] }], profiles: [], advances: [], audits: [],
} satisfies PayrollSnapshot;

describe("financial overview", () => {
  it("combines collections, direct expenses and paid payroll without double counting legacy outgoing records", () => {
    const result = buildFinancialOverview(finance, expenses, payroll, "all");
    expect(result.collections).toBe(1000);
    expect(result.expenses).toBe(200);
    expect(result.paidPayroll).toBe(300);
    expect(result.otherOutgoings).toBe(50);
    expect(result.totalOutgoings).toBe(550);
    expect(result.net).toBe(450);
    expect(result.unpaidPayroll).toBe(200);
  });

  it("applies branch and date ranges to every total", () => {
    expect(buildFinancialOverview(finance, expenses, payroll, "branch-2").collections).toBe(0);
    expect(buildFinancialOverview(finance, expenses, payroll, "all", { dateFrom: "2026-08-21", dateTo: "2026-08-21" }).totalOutgoings).toBe(0);
    expect(getFinancialPeriodRange("week", "2026-08-20")).toEqual({ dateFrom: "2026-08-14", dateTo: "2026-08-20" });
  });
});
