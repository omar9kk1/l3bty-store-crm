import type { RoleId } from "@/permissions/types";

export function canManageAttendance(roles: readonly RoleId[]) { return roles.includes("owner") || roles.includes("manager"); }
export function canCaptureAttendance(roles: readonly RoleId[]) { return roles.length > 0; }
export function canViewOwnAttendance(roles: readonly RoleId[]) { return roles.length > 0; }
export function canRequestAttendanceException(roles: readonly RoleId[]) { return roles.length > 0; }
export function canCorrectAttendance(roles: readonly RoleId[]) { return canManageAttendance(roles); }
export function canReviewAttendanceException(roles: readonly RoleId[]) { return canManageAttendance(roles); }
