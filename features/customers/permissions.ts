import type { RoleId } from "@/permissions/types";
import type { Customer, CustomerAccess, CustomerActivityType } from "./types";

export function resolveCustomerAccess(roles: readonly RoleId[]): CustomerAccess {
  const management = roles.includes("owner") || roles.includes("manager");
  const activities = new Set<CustomerActivityType>();

  if (management) activities.add("sales");
  if (management) activities.add("rental");
  if (management) activities.add("maintenance");

  return {
    canCreate: management,
    canEdit: management,
    canViewSales: management,
    canViewRentals: management,
    canViewMaintenance: management,
    canViewFullTimeline: management,
    canRequestDelete: roles.includes("sales_employee") || roles.includes("rental_maintenance_employee"),
    canDeleteDirectly: management,
    canReviewDeleteRequests: roles.includes("manager"),
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
