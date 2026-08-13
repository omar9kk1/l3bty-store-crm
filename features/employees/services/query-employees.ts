import type { Employee, EmployeeFilters, EmployeeSummary } from "../types";

export function filterEmployees(employees: readonly Employee[], filters: EmployeeFilters) {
  const needle = filters.q.trim().toLocaleLowerCase("ar");
  const result = employees.filter((employee) => {
    const activeRoles = employee.roleAssignments.filter((assignment) => assignment.active).map((assignment) => assignment.roleKey);
    const matchesText = !needle || [employee.name, employee.phone, employee.employeeNumber, employee.jobTitle].some((value) => value.toLocaleLowerCase("ar").includes(needle));
    return matchesText && (filters.branch === "all" || employee.assignedBranchIds.includes(filters.branch)) && (filters.role === "all" || activeRoles.includes(filters.role as never)) && (filters.status === "all" || employee.status === filters.status) && (filters.employmentType === "all" || employee.employmentType === filters.employmentType) && (filters.multiRole === "all" || (filters.multiRole === "yes" ? activeRoles.length > 1 : activeRoles.length === 1));
  });
  return [...result].sort((a, b) => filters.sort === "name" ? a.name.localeCompare(b.name, "ar") : filters.sort === "employee_number" ? a.employeeNumber.localeCompare(b.employeeNumber) : b.lastActiveAt.localeCompare(a.lastActiveAt));
}

export function paginateEmployees(employees: readonly Employee[], requestedPage: number, pageSize = 8) {
  const pageCount = Math.max(1, Math.ceil(employees.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { items: employees.slice((page - 1) * pageSize, page * pageSize), page, pageCount };
}

export function summarizeEmployees(employees: readonly Employee[]): EmployeeSummary {
  return employees.reduce<EmployeeSummary>((summary, employee) => {
    summary.total += 1; if (employee.status === "active") summary.active += 1; if (employee.status === "suspended") summary.suspended += 1; if (employee.roleAssignments.filter((item) => item.active).length > 1) summary.multiRole += 1; employee.assignedBranchIds.forEach((branchId) => { summary.byBranch[branchId] = (summary.byBranch[branchId] ?? 0) + 1; }); return summary;
  }, { total: 0, active: 0, suspended: 0, multiRole: 0, byBranch: {} });
}
