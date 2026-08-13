import type { RoleId } from "@/permissions/types";

export function canManageEmployees(roles: readonly RoleId[]) {
  return roles.includes("owner") || roles.includes("manager");
}

export function canOpenOwnProfile(roles: readonly RoleId[]) {
  return roles.length > 0;
}
