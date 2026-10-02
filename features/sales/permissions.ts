import type { RoleId } from "@/permissions/types";
export const SALES_EMPLOYEE_DISCOUNT_LIMIT_PERCENT=10;
export function canViewSales(roles:readonly RoleId[]){return roles.some((role)=>role==="owner"||role==="manager"||role==="sales_employee");}
export function canManageSaleOverrides(roles:readonly RoleId[]){return roles.includes("owner")||roles.includes("manager");}
export function canOperatePointOfSale(roles:readonly RoleId[]){return roles.includes("sales_employee")&&!roles.includes("owner")&&!roles.includes("manager");}
export function canAccessSaleBranch(roles:readonly RoleId[],branchId:string,availableBranchIds:readonly string[]){return roles.includes("owner")||roles.includes("manager")||(roles.includes("sales_employee")&&availableBranchIds.includes(branchId));}
export function canSendSaleWhatsApp(roles:readonly RoleId[]){return canViewSales(roles);}
