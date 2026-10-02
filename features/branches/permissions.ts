import type { RoleId } from "@/permissions/types";
import type { Branch, BranchAccess } from "./types";

export function resolveBranchAccess(roles: readonly RoleId[]): BranchAccess {
  const management = roles.includes("owner") || roles.includes("manager");
  return {
    canManage: management,
    canViewEmployees: management,
    canViewWarehouses: management,
    canViewCashboxes: management,
    canViewSales: management,
    canViewRentals: management,
    canViewMaintenance: management,
    canViewShifts: management,
  };
}

export function scopeBranches(branches: readonly Branch[], roles: readonly RoleId[]) {
  const access = resolveBranchAccess(roles);
  return access.canManage ? [...branches] : [];
}

export function canAccessBranch(branch: Branch, roles: readonly RoleId[]) {
  return scopeBranches([branch], roles).length === 1;
}
