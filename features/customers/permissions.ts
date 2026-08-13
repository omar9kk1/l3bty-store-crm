import type { RoleId } from "@/permissions/types";
import type { Customer, CustomerAccess, CustomerActivityType } from "./types";

export function resolveCustomerAccess(roles: readonly RoleId[]): CustomerAccess {
  const management = roles.includes("owner") || roles.includes("manager");
  const sales = roles.includes("sales_employee");
  const rental = roles.includes("rental_maintenance_employee");
  const activities = new Set<CustomerActivityType>();

  if (management || sales) activities.add("sales");
  if (management || rental) activities.add("rental");
  if (management || rental) activities.add("maintenance");

  return {
    canCreate: management || sales || rental,
    canEdit: management || sales || rental,
    canViewFinancial: management || sales || rental,
    canViewSales: management || sales,
    canViewRentals: management || rental,
    canViewMaintenance: management || rental,
    canViewFullTimeline: management,
    allowedActivityTypes: [...activities],
  };
}

export function customerMatchesRoles(customer: Customer, roles: readonly RoleId[]) {
  if (roles.includes("owner") || roles.includes("manager")) return true;

  return roles.some((role) => {
    if (role === "sales_employee") return customer.activityTypes.includes("sales");
    if (role === "rental_maintenance_employee") {
      return customer.activityTypes.includes("rental") || customer.activityTypes.includes("maintenance");
    }
    return false;
  });
}
