import type { RoleId } from "@/permissions/types";
import type { DashboardActivityType, DashboardMode } from "./types";

export function isManagementDashboard(roles: readonly RoleId[]) {
  return roles.includes("owner") || roles.includes("manager");
}

export function resolveDashboardMode(roles: readonly RoleId[]): DashboardMode {
  if (isManagementDashboard(roles)) return "management";
  const operational = roles.filter((role) => role !== "owner" && role !== "manager");
  if (operational.length > 1) return "combined";
  if (roles.includes("sales_employee")) return "sales";
  if (roles.includes("rental_maintenance_employee")) return "rental";
  return "technician";
}

export function allowedActivityTypes(roles: readonly RoleId[]): DashboardActivityType[] {
  if (isManagementDashboard(roles)) return ["all", "sales", "rental", "maintenance"];
  const allowed = new Set<DashboardActivityType>();
  if (roles.includes("sales_employee")) allowed.add("sales");
  if (roles.includes("rental_maintenance_employee")) {
    allowed.add("rental");
    allowed.add("maintenance");
  }
  if (roles.includes("maintenance_technician")) allowed.add("maintenance");
  const values = [...allowed];
  return values.length > 1 ? ["all", ...values] : values;
}

export function dashboardVisibility(roles: readonly RoleId[]) {
  const management = isManagementDashboard(roles);
  const sales = roles.includes("sales_employee");
  const rental = roles.includes("rental_maintenance_employee");
  const technician = roles.includes("maintenance_technician");
  return {
    management,
    branchPerformance: management,
    rentalUtilization: management || rental,
    activeRentals: management || rental,
    maintenance: management || rental || technician,
    stock: true,
    attendance: true,
    alerts: true,
    sales,
  };
}
