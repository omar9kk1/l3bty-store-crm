import type { FinancialShift } from "@/features/shifts/types";
import type { FinanceSnapshot } from "../types";

export function filterFinanceByBranch(finance: FinanceSnapshot, shifts: readonly FinancialShift[], branchId: string) {
  const matches = (itemBranchId: string) => branchId === "all" || itemBranchId === branchId;
  return {
    cashboxes: finance.cashboxes.filter((item) => matches(item.branchId)),
    payments: finance.payments.filter((item) => matches(item.branchId)),
    receivables: finance.receivables.filter((item) => matches(item.branchId)),
    shifts: shifts.filter((item) => matches(item.branchId)),
  };
}
