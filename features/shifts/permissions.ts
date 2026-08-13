import type{RoleId}from"@/permissions/types";
export const isShiftAdmin=(roles:readonly RoleId[])=>roles.includes("owner")||roles.includes("manager");
export const canUseFinancialShift=(roles:readonly RoleId[])=>isShiftAdmin(roles)||roles.includes("sales_employee")||roles.includes("rental_maintenance_employee");
export const canReviewShift=isShiftAdmin;
export const currentMockEmployeeId=(roles:readonly RoleId[])=>roles.includes("owner")?"employee-owner":roles.includes("manager")?"employee-manager":roles.includes("sales_employee")&&roles.includes("rental_maintenance_employee")?"employee-dual":roles.includes("sales_employee")?"employee-sales":roles.includes("rental_maintenance_employee")?"employee-rental":"employee-technician";
