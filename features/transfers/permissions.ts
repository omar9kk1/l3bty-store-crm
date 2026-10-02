import type { RoleId } from "@/permissions/types";
import type { InventoryTransfer, TransferType } from "./types";

export const canManageTransfers = (roles: readonly RoleId[]) => roles.includes("manager");
export const isTransferAdmin = canManageTransfers;
export const canViewAllTransfers = (roles: readonly RoleId[]) => roles.includes("owner") || roles.includes("manager");

export const isSalesBranchRequester = (roles: readonly RoleId[]) =>
  roles.includes("sales_employee")
  && !isTransferAdmin(roles)
  && !roles.includes("rental_maintenance_employee")
  && !roles.includes("maintenance_technician");

export const isRentalBranchOperator = (roles: readonly RoleId[]) =>
  roles.includes("rental_maintenance_employee")
  && !isTransferAdmin(roles)
  && !roles.includes("sales_employee")
  && !roles.includes("maintenance_technician");

export const canViewTransfers = (roles: readonly RoleId[]) =>
  roles.some((role) => ["owner", "manager", "sales_employee", "rental_maintenance_employee", "maintenance_technician"].includes(role));

export const canCreateTransfer = (roles: readonly RoleId[]) =>
  canManageTransfers(roles);

export const canCreateMaintenanceWorkshopTransfer = (
  roles: readonly RoleId[],
  type?: string,
  orderId?: string,
) =>
  roles.includes("maintenance_technician")
  && type === "maintenance_to_workshop"
  && Boolean(orderId);

export const canApproveTransfer = canManageTransfers;

export const canOperateTransfer = (roles: readonly RoleId[]) =>
  canManageTransfers(roles) || roles.some((role) => ["sales_employee", "rental_maintenance_employee", "maintenance_technician"].includes(role));

export function creatableTransferTypes(roles: readonly RoleId[]): readonly TransferType[] {
  if (canManageTransfers(roles)) return ["branch_stock", "workshop_parts", "rental_asset", "maintenance_to_workshop", "maintenance_return"];
  if (roles.includes("maintenance_technician")) return ["maintenance_to_workshop"];
  return [];
}

export function allowedTransferTypes(roles: readonly RoleId[]): readonly TransferType[] {
  if (canViewAllTransfers(roles)) return ["branch_stock", "workshop_parts", "rental_asset", "maintenance_to_workshop", "maintenance_return"];
  const values: TransferType[] = [];
  if (roles.includes("sales_employee")) values.push("branch_stock");
  if (roles.includes("rental_maintenance_employee")) values.push("rental_asset", "maintenance_to_workshop", "maintenance_return");
  if (roles.includes("maintenance_technician")) values.push("workshop_parts", "maintenance_to_workshop", "maintenance_return");
  return [...new Set(values)];
}

export function isTechnicianTransferDirectionValid(type: TransferType, source: string, destination: string) {
  if (type === "workshop_parts") return (source === "workshop") !== (destination === "workshop");
  if (type === "maintenance_to_workshop") return source !== "workshop" && destination === "workshop";
  if (type === "maintenance_return") return source === "workshop" && destination !== "workshop";
  return false;
}

export function canDispatchTransfer(roles: readonly RoleId[], transfer: InventoryTransfer, allowedBranches: ReadonlySet<string>) {
  void transfer;
  void allowedBranches;
  if (canManageTransfers(roles)) return true;
  return false;
}

export function isTechnicianWorkshopTransferVisible(
  roles: readonly RoleId[],
  transfer: Pick<InventoryTransfer, "transferType" | "sourceLocationId" | "destinationLocationId">,
) {
  return roles.includes("maintenance_technician")
    && allowedTransferTypes(roles).includes(transfer.transferType)
    && (transfer.sourceLocationId === "workshop" || transfer.destinationLocationId === "workshop");
}

export function canReceiveTransfer(roles: readonly RoleId[], transfer: InventoryTransfer, allowedBranches: ReadonlySet<string>) {
  if (canManageTransfers(roles)) return true;
  if (isSalesBranchRequester(roles)) return transfer.transferType === "branch_stock" && allowedBranches.has(transfer.destinationLocationId);
  if (roles.includes("maintenance_technician")) {
    if (transfer.transferType === "workshop_parts") return transfer.destinationLocationId === "workshop";
    return transfer.destinationLocationId === "workshop"
      && transfer.transferType === "maintenance_to_workshop"
      && Boolean(transfer.relatedMaintenanceOrderId);
  }
  return canOperateTransfer(roles) && allowedBranches.has(transfer.destinationLocationId);
}
