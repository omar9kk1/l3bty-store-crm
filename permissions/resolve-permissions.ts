import { ALL_PERMISSIONS } from "./keys";
import { ROLE_TEMPLATES } from "./role-templates";
import type { PermissionKey, RoleId } from "./types";

export function resolvePermissions(roles: readonly RoleId[]): Set<PermissionKey> {
  if (roles.includes("owner") || roles.includes("manager")) {
    return new Set(ALL_PERMISSIONS);
  }

  return new Set(roles.flatMap((role) => ROLE_TEMPLATES[role].permissions));
}

export function resolveBranchIds(roles: readonly RoleId[]): "all" | Set<string> {
  if (roles.some((role) => ROLE_TEMPLATES[role].branchIds === "all")) {
    return "all";
  }

  return new Set(
    roles.flatMap((role) => {
      const branches = ROLE_TEMPLATES[role].branchIds;
      return branches === "all" ? [] : branches;
    }),
  );
}

export function hasPermission(
  permissions: ReadonlySet<PermissionKey>,
  permission: PermissionKey,
): boolean {
  return permissions.has(permission);
}
