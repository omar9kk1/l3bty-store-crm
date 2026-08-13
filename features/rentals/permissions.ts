import type { RoleId } from "@/permissions/types";
export function canViewRentals(roles: readonly RoleId[]) { return roles.some((role) => role === "owner" || role === "manager" || role === "rental_maintenance_employee"); }
export function canManageRentals(roles: readonly RoleId[]) { return canViewRentals(roles); }
export function canOverrideRentalPrice(roles: readonly RoleId[]) { return roles.includes("owner") || roles.includes("manager"); }
export function canSendRentalWhatsApp(roles: readonly RoleId[]) { return canManageRentals(roles); }
export function canAccessRentalBranch(roles: readonly RoleId[], branchId: string, availableBranchIds: readonly string[]) { if (roles.includes("owner") || roles.includes("manager")) return true; return roles.includes("rental_maintenance_employee") && availableBranchIds.includes(branchId); }
export function currentRentalActorId(roles: readonly RoleId[]) { if (roles.includes("owner")) return "employee-owner"; if (roles.includes("manager")) return "employee-manager"; return "employee-rental"; }

export function canUseRentalAdministrativeFilters(roles: readonly RoleId[]) { return roles.includes("owner") || roles.includes("manager"); }

