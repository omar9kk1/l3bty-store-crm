import type { Branch, BranchQuery, BranchSummaryData } from "../types";
import type { Employee } from "@/features/employees/types";

export function applyEmployeeCounts(branches: readonly Branch[], employees: readonly Employee[]): Branch[] {
  const employeeCounts = new Map<string, number>();
  const technicianCounts = new Map<string, number>();

  for (const employee of employees) {
    const assignedBranchIds = new Set(employee.assignedBranchIds);
    const isTechnician = employee.roleAssignments.some((assignment) => assignment.active && assignment.roleKey === "maintenance_technician");

    for (const branchId of assignedBranchIds) {
      employeeCounts.set(branchId, (employeeCounts.get(branchId) ?? 0) + 1);
      if (isTechnician) technicianCounts.set(branchId, (technicianCounts.get(branchId) ?? 0) + 1);
    }
  }

  return branches.map((branch) => ({
    ...branch,
    assignedEmployeeCount: employeeCounts.get(branch.id) ?? 0,
    technicianCount: technicianCounts.get(branch.id) ?? 0,
  }));
}

export function matchesBranchSearch(branch: Branch, value: string) {
  const query = value.trim().toLocaleLowerCase("ar");
  if (!query) return true;
  return [branch.name, branch.code, branch.area, branch.city].some((field) => field.toLocaleLowerCase("ar").includes(query));
}

export function filterBranches(branches: readonly Branch[], query: BranchQuery, activeBranchId = "all") {
  return [...branches]
    .filter((branch) => matchesBranchSearch(branch, query.q))
    .filter((branch) => query.type === "all" || branch.type === query.type)
    .filter((branch) => query.status === "all" || branch.status === query.status)
    .sort((first, second) => {
      if (activeBranchId !== "all") {
        if (first.id === activeBranchId) return -1;
        if (second.id === activeBranchId) return 1;
      }
      if (query.sort === "code") return first.code.localeCompare(second.code, "en");
      if (query.sort === "employees") return second.assignedEmployeeCount - first.assignedEmployeeCount;
      if (query.sort === "updated") return second.updatedAt.localeCompare(first.updatedAt);
      return first.name.localeCompare(second.name, "ar");
    });
}

export function summarizeBranches(branches: readonly Branch[]): BranchSummaryData {
  return {
    active: branches.filter((branch) => branch.status === "active").length,
    inactive: branches.filter((branch) => branch.status !== "active").length,
    employees: branches.reduce((total, branch) => total + branch.assignedEmployeeCount, 0),
    openShifts: branches.reduce((total, branch) => total + branch.openShiftCount, 0),
    openMaintenance: branches.reduce((total, branch) => total + branch.openMaintenanceOrderCount, 0),
  };
}
