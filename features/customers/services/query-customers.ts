import type { RoleId } from "@/permissions/types";
import { customerMatchesRoles } from "../permissions";
import type { Customer, CustomerQuery, CustomerSummaryData } from "../types";
import { normalizePhone } from "./normalize-phone";

export const CUSTOMERS_PER_PAGE = 6;

export function scopeCustomers(
  customers: readonly Customer[],
  roles: readonly RoleId[],
  activeBranchId: string,
  availableBranchIds: readonly string[],
) {
  const allowedBranches = new Set(availableBranchIds.filter((id) => id !== "all"));
  return customers.filter((customer) => {
    if (customer.deletedAt) return false;
    if (!customerMatchesRoles(customer, roles)) return false;
    if (!customer.branchIds.some((branchId) => allowedBranches.has(branchId))) return false;
    return activeBranchId === "all" || customer.branchIds.includes(activeBranchId);
  });
}

export function matchesCustomerSearch(customer: Customer, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const digits = normalizePhone(trimmed);
  if (digits.length >= 3) {
    const phoneMatch = [customer.primaryPhone, ...customer.alternatePhones]
      .map(normalizePhone)
      .some((phone) => phone.includes(digits));
    const numberMatch = customer.customerNumber.replace(/\D/g, "").includes(digits);
    if (phoneMatch || numberMatch) return true;
  }
  return customer.name.toLocaleLowerCase("ar").includes(trimmed.toLocaleLowerCase("ar"))
    || customer.customerNumber.toLocaleLowerCase("en").includes(trimmed.toLocaleLowerCase("en"));
}

export function filterCustomers(customers: readonly Customer[], query: CustomerQuery) {
  return [...customers]
    .filter((customer) => matchesCustomerSearch(customer, query.q))
    .filter((customer) => query.status === "all" || customer.status === query.status)
    .filter((customer) => query.flag === "all" || customer.flags.includes(query.flag))
    .filter((customer) => query.activity === "all" || customer.activityTypes.includes(query.activity))
    .sort((first, second) => {
      if (query.sort === "name") return first.name.localeCompare(second.name, "ar");
      return second.lastActivityAt.localeCompare(first.lastActivityAt);
    });
}

export function paginateCustomers(customers: readonly Customer[], page: number) {
  const pageCount = Math.max(1, Math.ceil(customers.length / CUSTOMERS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  return {
    page: safePage,
    pageCount,
    items: customers.slice((safePage - 1) * CUSTOMERS_PER_PAGE, safePage * CUSTOMERS_PER_PAGE),
  };
}

export function summarizeCustomers(customers: readonly Customer[]): CustomerSummaryData {
  return {
    total: customers.length,
    active: customers.filter((customer) => customer.status === "active").length,
    needsReview: customers.filter((customer) => customer.flags.includes("needs_review")).length,
  };
}
