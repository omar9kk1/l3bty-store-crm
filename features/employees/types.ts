import type { RoleId } from "@/permissions/types";

export type EmployeeStatus = "active" | "suspended" | "inactive";
export type EmploymentType = "full_time" | "part_time" | "temporary";
export type EmployeeViewState = "normal" | "loading" | "empty" | "error" | "offline";
export type EmployeeSort = "recent" | "name" | "employee_number";

export interface EmployeeRoleAssignment {
  roleKey: RoleId;
  branchIds: "all" | readonly string[];
  active: boolean;
  assignedAt: string;
  assignedBy: string;
}

export interface EmployeeStatusEvent {
  id: string;
  status: EmployeeStatus;
  reason: string;
  at: string;
  by: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  userId: string;
  name: string;
  phone: string;
  alternatePhone: string;
  email: string;
  nationalIdLast4: string;
  jobTitle: string;
  status: EmployeeStatus;
  primaryBranchId: string;
  assignedBranchIds: readonly string[];
  roleAssignments: readonly EmployeeRoleAssignment[];
  hireDate: string;
  employmentType: EmploymentType;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  statusHistory: readonly EmployeeStatusEvent[];
}

export interface EmployeeFormValues {
  employeeNumber: string;
  name: string;
  phone: string;
  alternatePhone: string;
  email: string;
  nationalIdLast4: string;
  jobTitle: string;
  status: EmployeeStatus;
  primaryBranchId: string;
  assignedBranchIds: string[];
  roleKeys: string[];
  hireDate: string;
  employmentType: EmploymentType;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  notes: string;
  adminAccessConfirmed: boolean;
  adminAccessReason: string;
  statusReason: string;
}

export interface EmployeeFormValidation {
  valid: boolean;
  errors: Partial<Record<keyof EmployeeFormValues, string>>;
  duplicate?: Employee;
  normalizedValues: EmployeeFormValues;
}

export interface EmployeeFilters {
  q: string;
  branch: string;
  role: string;
  status: EmployeeStatus | "all";
  employmentType: EmploymentType | "all";
  multiRole: "all" | "yes" | "no";
  sort: EmployeeSort;
}

export interface EmployeeSummary {
  total: number;
  active: number;
  suspended: number;
  multiRole: number;
  byBranch: Record<string, number>;
}

export interface EmployeeAuditEvent {
  id: string;
  employeeId: string;
  action: "created" | "updated" | "status_changed" | "profile_updated";
  reason: string;
  at: string;
  by: string;
}
