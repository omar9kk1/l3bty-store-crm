import type { RoleId } from "@/permissions/types";
export const isExpenseAdmin=(roles:readonly RoleId[])=>roles.includes("owner")||roles.includes("manager");
export const canUsePersonalExpenses=(roles:readonly RoleId[])=>roles.length>0;
export const canApproveExpense=isExpenseAdmin;

