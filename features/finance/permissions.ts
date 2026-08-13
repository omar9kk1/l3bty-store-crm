import type{RoleId}from"@/permissions/types";
export const isFinanceAdmin=(roles:readonly RoleId[])=>roles.includes("owner")||roles.includes("manager");
export const canViewFinance=isFinanceAdmin;
export const canManageCashboxes=isFinanceAdmin;
export const canCreateVoucher=isFinanceAdmin;
export const canReversePayment=isFinanceAdmin;
export const canCollectMoney=(roles:readonly RoleId[])=>isFinanceAdmin(roles)||roles.includes("sales_employee")||roles.includes("rental_maintenance_employee");
export const canCollectSource=(roles:readonly RoleId[],source:string)=>isFinanceAdmin(roles)||(source==="sale"&&roles.includes("sales_employee"))||(["rental","maintenance"].includes(source)&&roles.includes("rental_maintenance_employee"));
