import type { RoleId } from "@/permissions/types";
export const isPayrollAdmin=(roles:readonly RoleId[])=>roles.includes("owner")||roles.includes("manager");
export const canViewOwnPayroll=(roles:readonly RoleId[])=>roles.length>0;

