import type { RoleId } from "@/permissions/types";
import type { AuditCategory, AuditEvent } from "./types";

const categoriesByRole: Record<RoleId, readonly AuditCategory[]> = {
  owner: ["employees", "attendance", "rental", "sales", "maintenance", "inventory", "transfer", "finance", "shift", "expense", "payroll", "report", "customer", "system"],
  manager: ["employees", "attendance", "rental", "sales", "maintenance", "inventory", "transfer", "finance", "shift", "expense", "payroll", "report", "customer", "system"],
  sales_employee: ["attendance", "sales", "inventory", "transfer", "shift", "customer", "system"],
  rental_maintenance_employee: ["attendance", "rental", "maintenance", "inventory", "transfer", "shift", "customer", "system"],
  maintenance_technician: ["attendance", "maintenance", "inventory", "transfer", "system"],
};

export const canViewAdministrativeAudit = (roles: readonly RoleId[]) => roles.includes("owner") || roles.includes("manager");
export const canViewPersonalAudit = (roles: readonly RoleId[]) => roles.length > 0;
export const allowedPersonalAuditCategories = (roles: readonly RoleId[]) => new Set(roles.flatMap((role) => categoriesByRole[role]));
export function canViewPersonalEvent(event: AuditEvent, employeeId: string, roles: readonly RoleId[]) {
  return event.actorEmployeeId === employeeId && allowedPersonalAuditCategories(roles).has(event.category);
}
