import { EMPLOYEE_FIXTURES } from "../fixtures";
import type { Employee, EmployeeAuditEvent, EmployeeFormValues } from "../types";
import { ROLE_IDS, type RoleId } from "@/permissions/types";
import { appendAuditEvent } from "@/features/audit-log/services/audit-service";

let employees: readonly Employee[] = EMPLOYEE_FIXTURES.map(cloneEmployee);
let sequence = EMPLOYEE_FIXTURES.length + 1;
let auditEvents: readonly EmployeeAuditEvent[] = [];
const listeners = new Set<() => void>();

function cloneEmployee(employee: Employee): Employee { return { ...employee, assignedBranchIds: [...employee.assignedBranchIds], roleAssignments: employee.roleAssignments.map((item) => ({ ...item, branchIds: item.branchIds === "all" ? "all" : [...item.branchIds] })), statusHistory: employee.statusHistory.map((item) => ({ ...item })) }; }
function emit() { listeners.forEach((listener) => listener()); }
export function subscribeEmployees(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getEmployeesSnapshot() { return employees; }
export function getEmployeeAuditEvents() { return auditEvents; }

function buildAssignments(values: EmployeeFormValues) {
  const now = "2026-08-05T16:00:00+03:00";
  return values.roleKeys.filter((role): role is RoleId => ROLE_IDS.includes(role as RoleId)).map((roleKey) => ({ roleKey, branchIds: roleKey === "owner" || roleKey === "manager" ? "all" as const : [...values.assignedBranchIds], active: true, assignedAt: now, assignedBy: "المستخدم الإداري الحالي — Mock" }));
}
function record(employeeId: string, action: EmployeeAuditEvent["action"], reason: string) {
  const localId = `employee-audit-${auditEvents.length + 1}`;
  auditEvents = [{ id: localId, employeeId, action, reason, at: "2026-08-05T16:00:00+03:00", by: "المستخدم الإداري الحالي — Mock" }, ...auditEvents];
  appendAuditEvent({ actorUserId: "user-manager", actorEmployeeId: "employee-manager", actorRolesSnapshot: ["manager"], branchId: "all", action: `employee_${action}`, category: "employees", entityType: "employee", entityId: employeeId, referenceNumber: employeeId, severity: action === "profile_updated" ? "notice" : "important", reason, before: null, after: { action }, changedFields: [], source: "web", requestId: `req-${localId}`, idempotencyKey: `employee:${localId}`, ipAddressMock: "192.0.2.10", userAgentSummaryMock: "Desktop Web · Mock", createdAt: "2026-08-05T13:00:00.000Z" });
}

export function createEmployee(values: EmployeeFormValues) {
  const now = "2026-08-05T16:00:00+03:00";
  const id = `employee-${String(sequence++).padStart(3, "0")}`;
  const employee: Employee = { id, employeeNumber: values.employeeNumber, userId: `user-${id}`, name: values.name, phone: values.phone, alternatePhone: values.alternatePhone, email: values.email, nationalIdLast4: values.nationalIdLast4, jobTitle: values.jobTitle, status: values.status, primaryBranchId: values.primaryBranchId, assignedBranchIds: [...values.assignedBranchIds], roleAssignments: buildAssignments(values), hireDate: values.hireDate, employmentType: values.employmentType, emergencyContactName: values.emergencyContactName, emergencyContactPhone: values.emergencyContactPhone, address: values.address, notes: values.notes, createdAt: now, updatedAt: now, lastActiveAt: now, statusHistory: [{ id: `status-${id}-1`, status: values.status, reason: "إنشاء سجل الموظف", at: now, by: "المستخدم الإداري الحالي — Mock" }] };
  employees = [employee, ...employees]; record(id, "created", values.adminAccessReason || "إنشاء موظف تجريبي"); emit(); return employee;
}

export function updateEmployee(employeeId: string, values: EmployeeFormValues) {
  let updated: Employee | undefined;
  let action: EmployeeAuditEvent["action"] = "updated";
  employees = employees.map((employee) => {
    if (employee.id !== employeeId) return employee;
    const changedStatus = employee.status !== values.status;
    if (changedStatus) action = "status_changed";
    updated = { ...employee, employeeNumber: values.employeeNumber, name: values.name, phone: values.phone, alternatePhone: values.alternatePhone, email: values.email, nationalIdLast4: values.nationalIdLast4, jobTitle: values.jobTitle, status: values.status, primaryBranchId: values.primaryBranchId, assignedBranchIds: [...values.assignedBranchIds], roleAssignments: buildAssignments(values), hireDate: values.hireDate, employmentType: values.employmentType, emergencyContactName: values.emergencyContactName, emergencyContactPhone: values.emergencyContactPhone, address: values.address, notes: values.notes, updatedAt: "2026-08-05T16:00:00+03:00", statusHistory: changedStatus ? [{ id: `status-${employee.id}-${employee.statusHistory.length + 1}`, status: values.status, reason: values.statusReason, at: "2026-08-05T16:00:00+03:00", by: "المستخدم الإداري الحالي — Mock" }, ...employee.statusHistory] : employee.statusHistory };
    return updated;
  });
  if (updated) { record(employeeId, action, values.statusReason || values.adminAccessReason || "تحديث بيانات الموظف"); emit(); }
  return updated;
}

export function updateOwnProfile(employeeId: string, values: Pick<Employee, "alternatePhone" | "email" | "address" | "emergencyContactName" | "emergencyContactPhone">) {
  let updated: Employee | undefined;
  employees = employees.map((employee) => employee.id === employeeId ? (updated = { ...employee, ...values, updatedAt: "2026-08-05T16:00:00+03:00" }) : employee);
  if (updated) { record(employeeId, "profile_updated", "تحديث بيانات شخصية مسموحة"); emit(); }
  return updated;
}

export function resetEmployeeStore() { employees = EMPLOYEE_FIXTURES.map(cloneEmployee); sequence = EMPLOYEE_FIXTURES.length + 1; auditEvents = []; emit(); }
