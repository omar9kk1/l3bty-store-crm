import type { RoleId } from "@/permissions/types";

export function canViewProducts(roles: readonly RoleId[]) { return roles.some((role) => role === "owner" || role === "manager" || role === "sales_employee"); }
export function canManageProducts(roles: readonly RoleId[]) { return roles.includes("manager"); }
export function canViewProductCost(roles: readonly RoleId[]) { return roles.includes("owner") || roles.includes("manager"); }
export function canAccessSalesBranch(roles: readonly RoleId[], branchId: string, branchIds: readonly string[]) { return roles.includes("owner") || roles.includes("manager") || (roles.includes("sales_employee") && branchIds.includes(branchId)); }
