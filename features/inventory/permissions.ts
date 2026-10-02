import type {RoleId} from "@/permissions/types";
export const isInventoryAdmin=(roles:readonly RoleId[])=>roles.includes("owner")||roles.includes("manager");
export const canManageInventory=(roles:readonly RoleId[])=>roles.includes("manager");
export const canViewInventory=(roles:readonly RoleId[])=>roles.some((role)=>["owner","manager","sales_employee","rental_maintenance_employee","maintenance_technician"].includes(role));
export const canViewInventoryCost=isInventoryAdmin;
export const canAdjustInventory=canManageInventory;
export const canViewSaleStock=(roles:readonly RoleId[])=>isInventoryAdmin(roles)||roles.includes("sales_employee")||roles.includes("maintenance_technician");
export const canViewSparePartStock=(roles:readonly RoleId[])=>isInventoryAdmin(roles)||roles.some((role)=>["sales_employee","rental_maintenance_employee","maintenance_technician"].includes(role));
export const canViewAssetLocations=(roles:readonly RoleId[])=>isInventoryAdmin(roles)||roles.includes("rental_maintenance_employee");
