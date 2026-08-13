import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { findNavigationItem } from "@/permissions/navigation-policy";
import { resolveBranchIds, resolvePermissions } from "@/permissions/resolve-permissions";
import type { RoleId } from "@/permissions/types";
import type { AppNotification, NotificationCategory } from "./types";

const categoriesByRole: Record<RoleId, readonly NotificationCategory[]> = {
  owner: ["rental", "sales", "maintenance", "inventory", "transfer", "finance", "shift", "expense", "payroll", "attendance", "report", "customer", "system"],
  manager: ["rental", "sales", "maintenance", "inventory", "transfer", "finance", "shift", "expense", "payroll", "attendance", "report", "customer", "system"],
  sales_employee: ["sales", "inventory", "transfer", "shift", "attendance", "customer", "system"],
  rental_maintenance_employee: ["rental", "maintenance", "inventory", "transfer", "shift", "attendance", "customer", "system"],
  maintenance_technician: ["maintenance", "inventory", "transfer", "attendance", "system"],
};

export function resolveNotificationIdentity(roles: readonly RoleId[]) {
  const employee = resolvePreviewEmployee(roles);
  return { userId: employee.userId, employeeId: employee.id, employee };
}

export function allowedNotificationCategories(roles: readonly RoleId[]) {
  return new Set(roles.flatMap((role) => categoriesByRole[role]));
}

export function canReceiveNotification(notification: AppNotification, roles: readonly RoleId[]) {
  const identity = resolveNotificationIdentity(roles);
  if (notification.recipientUserId !== identity.userId || notification.recipientEmployeeId !== identity.employeeId) return false;
  if (!allowedNotificationCategories(roles).has(notification.category)) return false;
  const branchIds = resolveBranchIds(roles);
  return notification.branchId === "all" || branchIds === "all" || branchIds.has(notification.branchId);
}

export function canOpenNotificationReference(notification: AppNotification, roles: readonly RoleId[]) {
  if (!canReceiveNotification(notification, roles)) return false;
  const item = findNavigationItem(notification.deepLink);
  return !item || resolvePermissions(roles).has(item.requiredPermission);
}
