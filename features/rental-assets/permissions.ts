import type { RoleId } from "@/permissions/types";

export function canViewRentalAssets(roles: readonly RoleId[]) {
  return roles.some((role) => role === "owner" || role === "manager" || role === "rental_maintenance_employee");
}

export function canOperateRentalAssets(roles: readonly RoleId[]) {
  return roles.some((role) => role === "owner" || role === "manager" || role === "rental_maintenance_employee");
}

export function isTechnicianAssetView(roles: readonly RoleId[]) {
  return canViewRentalAssets(roles) && roles.includes("maintenance_technician") && !canOperateRentalAssets(roles);
}
