import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePermissions } from "@/permissions/resolve-permissions";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { ATTENDANCE_EVENT_FIXTURES } from "../fixtures";
import { canCorrectAttendance, canManageAttendance, canViewOwnAttendance } from "../permissions";
import { captureAttendance, correctAttendanceDay, getAttendanceSnapshot, requestAttendanceException, resetAttendanceStore, reviewAttendanceException } from "../services/attendance-store";
import { haversineDistanceMeters, resolveLocationStatus, resolveShiftWorkDate, validateAttendanceSequence } from "../services/attendance-rules";
import { ownDays } from "../services/query-attendance";
import { getAttendancePeriodStart, getEgyptDate, getEgyptNowIso } from "../services/attendance-time";

describe("attendance rules", () => {
  beforeEach(resetAttendanceStore);
  afterEach(() => vi.useRealTimers());
  it("calculates Haversine distance deterministically", () => { expect(haversineDistanceMeters(30.0444, 31.2357, 30.0444, 31.2357)).toBe(0); expect(haversineDistanceMeters(30.0444, 31.2357, 30.0454, 31.2357)).toBeGreaterThan(100); });
  it("classifies geofence readings", () => { expect(resolveLocationStatus(50, 150, 20)).toBe("inside"); expect(resolveLocationStatus(151, 150, 20)).toBe("outside"); expect(resolveLocationStatus(20, 150, 250)).toBe("inaccurate"); expect(resolveLocationStatus(Number.NaN, 150, 20)).toBe("unavailable"); });
  it("prevents checkout before checkin and repeated checkin", () => { expect(validateAttendanceSequence([], "check_out").valid).toBe(false); const checkIn = ATTENDANCE_EVENT_FIXTURES.filter((item) => item.id === "evt-tech-in"); expect(validateAttendanceSequence(checkIn, "check_in").valid).toBe(false); expect(validateAttendanceSequence(checkIn, "check_out").valid).toBe(true); });
  it("keeps cross-midnight shifts on the check-in date", () => { expect(resolveShiftWorkDate("2026-08-04T23:45:00+03:00", "2026-08-05T07:10:00+03:00")).toBe("2026-08-04"); });
  it("captures with a live session reference", () => { const result = captureAttendance({ employeeId: "employee-technician", branchId: "workshop", type: "check_out", latitude: 30.071, longitude: 31.281, accuracyMeters: 12, distanceFromBranchMeters: 5, geofenceRadiusMeters: 250, livePhotoSessionKey: "live-test" }); expect(result.valid).toBe(true); expect(getAttendanceSnapshot().events[0].livePhotoSessionKey).toBe("live-test"); });
  it("creates today's visible day when attendance is captured", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T18:15:00.000Z"));
    const result = captureAttendance({ employeeId: "employee-001", branchId: "branch-01", type: "check_in", latitude: 30.0444, longitude: 31.2357, accuracyMeters: 10, distanceFromBranchMeters: 5, geofenceRadiusMeters: 150, livePhotoSessionKey: "live-today" });
    expect(result.valid).toBe(true);
    const day = getAttendanceSnapshot().days.find((item) => item.employeeId === "employee-001");
    expect(day).toMatchObject({ workDate: "2026-08-18", checkInEventId: getAttendanceSnapshot().events[0].id, shiftEndedAt: null });
    expect(ownDays(getAttendanceSnapshot().days, "employee-001", "today", "all", "2026-08-18")).toHaveLength(1);
  });
  it("updates the same day on checkout instead of creating a disconnected record", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T07:00:00.000Z"));
    captureAttendance({ employeeId: "employee-001", branchId: "branch-01", type: "check_in", latitude: 30.0444, longitude: 31.2357, accuracyMeters: 10, distanceFromBranchMeters: 5, geofenceRadiusMeters: 150, livePhotoSessionKey: "live-in" });
    vi.setSystemTime(new Date("2026-08-18T15:00:00.000Z"));
    const result = captureAttendance({ employeeId: "employee-001", branchId: "branch-01", type: "check_out", latitude: 30.0444, longitude: 31.2357, accuracyMeters: 10, distanceFromBranchMeters: 5, geofenceRadiusMeters: 150, livePhotoSessionKey: "live-out" });
    const employeeDays = getAttendanceSnapshot().days.filter((item) => item.employeeId === "employee-001");
    expect(result.valid).toBe(true);
    expect(employeeDays).toHaveLength(1);
    expect(employeeDays[0]).toMatchObject({ workedMinutes: 480, checkOutEventId: getAttendanceSnapshot().events[0].id });
  });
  it("uses Egypt's real date and Saturday as the weekly boundary", () => {
    const instant = new Date("2026-08-18T20:30:00.000Z");
    expect(getEgyptDate(instant)).toBe("2026-08-18");
    expect(getEgyptNowIso(instant)).toBe("2026-08-18T23:30:00+03:00");
    expect(getAttendancePeriodStart("week", "2026-08-18")).toBe("2026-08-15");
  });
});

describe("attendance permissions and audit", () => {
  beforeEach(resetAttendanceStore);
  it.each(["owner", "manager"] as const)("grants %s full management", (role) => { const permissions = resolvePermissions([role]); expect(permissions.has(PERMISSION_KEYS.attendanceViewAll)).toBe(true); expect(canManageAttendance([role])).toBe(true); });
  it.each(["sales_employee", "rental_maintenance_employee", "maintenance_technician"] as const)("keeps %s personal-only", (role) => { const permissions = resolvePermissions([role]); expect(permissions.has(PERMISSION_KEYS.attendanceViewSelf)).toBe(true); expect(permissions.has(PERMISSION_KEYS.attendanceCapture)).toBe(true); expect(permissions.has(PERMISSION_KEYS.attendanceViewAll)).toBe(false); expect(canViewOwnAttendance([role])).toBe(true); expect(canCorrectAttendance([role])).toBe(false); });
  it("does not elevate operational multi-role users", () => { const roles = ["sales_employee", "rental_maintenance_employee"] as const; expect(resolvePermissions(roles).has(PERMISSION_KEYS.attendanceViewAll)).toBe(false); expect(canManageAttendance(roles)).toBe(false); });
  it("requires documented correction and review reasons", () => { expect(correctAttendanceDay("day-sales", "shiftStartedAt", "2026-08-06T10:00:00+03:00", "", "manager").valid).toBe(false); expect(correctAttendanceDay("day-sales", "shiftStartedAt", "2026-08-06T10:00:00+03:00", "تصحيح موثق", "manager").valid).toBe(true); expect(reviewAttendanceException("exception-pending", "approved", "", "manager").valid).toBe(false); expect(reviewAttendanceException("exception-pending", "approved", "مراجعة مكتملة", "manager").valid).toBe(true); expect(getAttendanceSnapshot().audits.length).toBe(2); });
  it("creates a pending employee-owned exception", () => { const item = requestAttendanceException({ attendanceDayId: "day-sales", employeeId: "employee-sales", branchId: "branch-2", type: "technical_error", reason: "خطأ تقني", employeeNote: "", evidence: null, taskReference: null }); expect(item.status).toBe("pending"); expect(item.employeeId).toBe("employee-sales"); });
});
