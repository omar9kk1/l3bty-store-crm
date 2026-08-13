import type { EmployeeStatus, EmploymentType } from "../types";

export const employeeStatusLabels: Record<EmployeeStatus, string> = { active: "نشط", suspended: "موقوف", inactive: "غير نشط" };
export const employeeStatusTones = { active: "success", suspended: "danger", inactive: "neutral" } as const;
export const employmentTypeLabels: Record<EmploymentType, string> = { full_time: "دوام كامل", part_time: "دوام جزئي", temporary: "مؤقت" };
