import type { RoleId } from "@/permissions/types";
import type { InventoryTransfer, TransferType } from "./types";

export const isTransferAdmin = (roles: readonly RoleId[]) => roles.includes("owner") || roles.includes("manager");

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
  isTransferAdmin(roles) || roles.some((role) => ["sales_employee", "rental_maintenance_employee", "maintenance_technician"].includes(role));

export const canApproveTransfer = isTransferAdmin;

export const canOperateTransfer = (roles: readonly RoleId[]) =>
  isTransferAdmin(roles) || roles.some((role) => ["sales_employee", "rental_maintenance_employee", "maintenance_technician"].includes(role));

export function creatableTransferTypes(roles: readonly RoleId[]): readonly TransferType[] {
  if (isTransferAdmin(roles)) return ["branch_stock", "workshop_parts", "rental_asset", "maintenance_to_workshop", "maintenance_return"];
  const values: TransferType[] = [];
  if (roles.includes("sales_employee")) values.push("branch_stock");
  if (roles.includes("rental_maintenance_employee")) values.push("rental_asset", "maintenance_to_workshop");
  if (roles.includes("maintenance_technician")) values.push("workshop_parts", "maintenance_to_workshop", "maintenance_return");
  return [...new Set(values)];
}

export function allowedTransferTypes(roles: readonly RoleId[]): readonly TransferType[] {
  const values = [...creatableTransferTypes(roles)];
  if (roles.includes("rental_maintenance_employee")) values.push("maintenance_return");
  return [...new Set(values)];
}

export function isTechnicianTransferDirectionValid(type: TransferType, source: string, destination: string) {
  if (type === "workshop_parts") return (source === "workshop") !== (destination === "workshop");
  if (type === "maintenance_to_workshop") return source !== "workshop" && destination === "workshop";
  if (type === "maintenance_return") return source === "workshop" && destination !== "workshop";
  return false;
}

export function canDispatchTransfer(roles: readonly RoleId[], transfer: InventoryTransfer, allowedBranches: ReadonlySet<string>) {
  if (isTransferAdmin(roles)) return true;
  if (isSalesBranchRequester(roles)) return false;
  if (roles.includes("maintenance_technician")) {
    if (transfer.transferType === "workshop_parts") return transfer.sourceLocationId === "workshop";
    return isTechnicianTransferDirectionValid(transfer.transferType, transfer.sourceLocationId, transfer.destinationLocationId)
      && Boolean(transfer.relatedMaintenanceOrderId);
  }
  return canOperateTransfer(roles) && allowedBranches.has(transfer.sourceLocationId);
}

export function canReceiveTransfer(roles: readonly RoleId[], transfer: InventoryTransfer, allowedBranches: ReadonlySet<string>) {
  if (isTransferAdmin(roles)) return true;
  if (isSalesBranchRequester(roles)) return transfer.transferType === "branch_stock" && allowedBranches.has(transfer.destinationLocationId);
  if (roles.includes("maintenance_technician")) {
    if (transfer.transferType === "workshop_parts") return transfer.destinationLocationId === "workshop";
    return transfer.destinationLocationId === "workshop"
      && transfer.transferType === "maintenance_to_workshop"
      && Boolean(transfer.relatedMaintenanceOrderId);
  }
  return canOperateTransfer(roles) && allowedBranches.has(transfer.destinationLocationId);
}
