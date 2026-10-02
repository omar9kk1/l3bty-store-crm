import type { RoleId } from "@/permissions/types";
import type { MaintenanceOrder } from "./types";

export const isMaintenanceAdmin = (roles:readonly RoleId[]) => roles.includes("owner") || roles.includes("manager");
export const canManageMaintenance = (roles:readonly RoleId[]) => roles.includes("manager");
export const canViewMaintenance = (roles:readonly RoleId[]) => roles.some((role) => role === "owner" || role === "manager" || role === "rental_maintenance_employee" || role === "maintenance_technician");
export const canIntakeMaintenance = (roles:readonly RoleId[]) => roles.includes("rental_maintenance_employee");
export const canWorkMaintenance = (roles:readonly RoleId[]) => canManageMaintenance(roles) || roles.includes("maintenance_technician");
export const canManageWorkshop = (roles:readonly RoleId[]) => canManageMaintenance(roles) || roles.includes("maintenance_technician");
export const canSendMaintenanceWhatsApp = (roles:readonly RoleId[]) => canManageMaintenance(roles) || roles.includes("rental_maintenance_employee");
export const canAccessMaintenanceBranch = (roles:readonly RoleId[],branchId:string,assignedBranches:readonly string[]) => isMaintenanceAdmin(roles) || (roles.includes("rental_maintenance_employee") && assignedBranches.includes(branchId)) || roles.includes("maintenance_technician");


const WORKSHOP_PICKUP_BLOCKED_STATUSES = new Set<MaintenanceOrder["status"]>([
  "transfer_requested",
  "in_transit_to_workshop",
  "received_at_workshop",
  "ready_for_return",
  "returning_to_branch",
  "ready_for_delivery",
  "delivered",
  "closed",
  "cancelled",
]);

export function canStartWorkshopPickup(order: MaintenanceOrder | undefined, technicianId: string) {
  return Boolean(
    order
    && order.assignedTechnicianId === technicianId
    && !order.workshopTransfer
    && !["workshop", "in_transit"].includes(order.currentLocation)
    && !WORKSHOP_PICKUP_BLOCKED_STATUSES.has(order.status),
  );
}
