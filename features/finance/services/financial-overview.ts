import type { ExpenseSnapshot } from "@/features/expenses/types";
import type { PayrollSnapshot } from "@/features/payroll/types";
import type { FinanceSnapshot, PaymentSourceType } from "../types";

export interface FinancialOverviewRange {
  dateFrom?: string;
  dateTo?: string;
}

export interface FinancialOverview {
  collections: number;
  expenses: number;
  paidPayroll: number;
  otherOutgoings: number;
  totalOutgoings: number;
  net: number;
  cashboxBalance: number;
  unpaidPayroll: number;
  collectionCount: number;
  expenseCount: number;
  paidPayrollCount: number;
  collectionBySource: readonly { source: PaymentSourceType; total: number }[];
}

const excludedOutgoingSources = new Set<PaymentSourceType>(["expense", "payroll"]);
const excludedExpenseStatuses = new Set(["cancelled", "reversed"]);

function branchMatches(selectedBranchId: string, itemBranchId: string) {
  return selectedBranchId === "all" || selectedBranchId === itemBranchId;
}

function dateMatches(value: string | null | undefined, range: FinancialOverviewRange) {
  if (!range.dateFrom && !range.dateTo) return true;
  if (!value) return false;
  const date = value.slice(0, 10);
  return (!range.dateFrom || date >= range.dateFrom) && (!range.dateTo || date <= range.dateTo);
}

export function buildFinancialOverview(
  finance: FinanceSnapshot,
  expenses: ExpenseSnapshot,
  payroll: PayrollSnapshot,
  branchId: string,
  range: FinancialOverviewRange = {},
): FinancialOverview {
  const scopedPayments = finance.payments.filter((payment) =>
    branchMatches(branchId, payment.branchId) &&
    payment.status === "completed" &&
    dateMatches(payment.paidAt, range));
  const incoming = scopedPayments.filter((payment) => payment.direction === "incoming");
  const otherOutgoingRows = scopedPayments.filter((payment) =>
    payment.direction === "outgoing" && !excludedOutgoingSources.has(payment.sourceType));

  const expenseRows = expenses.expenses.filter((expense) =>
    branchMatches(branchId, expense.branchId) &&
    !excludedExpenseStatuses.has(expense.status) &&
    dateMatches(expense.expenseDate || expense.createdAt, range));

  const payrollRuns = payroll.runs.filter((run) =>
    branchMatches(branchId, run.branchId) &&
    run.status !== "cancelled" &&
    dateMatches(run.paidAt ?? run.periodEnd, range));
  const paidPayrollLines = payrollRuns.flatMap((run) => run.lines).filter((line) => line.status === "paid");
  const unpaidPayrollLines = payrollRuns
    .filter((run) => ["approved", "partially_paid"].includes(run.status))
    .flatMap((run) => run.lines)
    .filter((line) => line.status !== "paid");

  const collections = incoming.reduce((sum, payment) => sum + payment.amount, 0);
  const expenseTotal = expenseRows.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paidPayroll = paidPayrollLines.reduce((sum, line) => sum + Number(line.netAmount), 0);
  const otherOutgoings = otherOutgoingRows.reduce((sum, payment) => sum + payment.amount, 0);
  const totalOutgoings = expenseTotal + paidPayroll + otherOutgoings;
  const collectionBySource = [...new Set(incoming.map((payment) => payment.sourceType))]
    .map((source) => ({
      source,
      total: incoming.filter((payment) => payment.sourceType === source).reduce((sum, payment) => sum + payment.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    collections,
    expenses: expenseTotal,
    paidPayroll,
    otherOutgoings,
    totalOutgoings,
    net: collections - totalOutgoings,
    cashboxBalance: finance.cashboxes
      .filter((cashbox) => branchMatches(branchId, cashbox.branchId))
      .reduce((sum, cashbox) => sum + cashbox.currentBalance, 0),
    unpaidPayroll: unpaidPayrollLines.reduce((sum, line) => sum + Number(line.netAmount), 0),
    collectionCount: incoming.length,
    expenseCount: expenseRows.length,
    paidPayrollCount: paidPayrollLines.length,
    collectionBySource,
  };
}

export function getFinancialReferenceDate(
  finance: FinanceSnapshot,
  expenses: ExpenseSnapshot,
  payroll: PayrollSnapshot,
) {
  const dates = [
    ...finance.payments.map((payment) => payment.paidAt.slice(0, 10)),
    ...expenses.expenses.map((expense) => (expense.expenseDate || expense.createdAt).slice(0, 10)),
    ...payroll.runs.map((run) => (run.paidAt ?? run.periodEnd).slice(0, 10)),
  ].filter(Boolean).sort();
  return dates.at(-1) ?? new Date().toISOString().slice(0, 10);
}

export function getFinancialPeriodRange(period: "all" | "day" | "week" | "month", referenceDate: string): FinancialOverviewRange {
  if (period === "all") return {};
  const days = period === "day" ? 0 : period === "week" ? 6 : 29;
  const end = new Date(`${referenceDate}T12:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - days);
  return { dateFrom: start.toISOString().slice(0, 10), dateTo: referenceDate };
}
