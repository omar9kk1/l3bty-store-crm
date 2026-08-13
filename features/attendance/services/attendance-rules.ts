import type { AttendanceDay, AttendanceEvent, AttendanceEventType, LocationStatus } from "../types";

const EARTH_RADIUS_METERS = 6_371_000;
const radians = (value: number) => value * Math.PI / 180;
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = radians(lat2 - lat1); const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
export function resolveLocationStatus(distance: number, radius: number, accuracy: number): LocationStatus { if (!Number.isFinite(distance)) return "unavailable"; if (accuracy > Math.max(radius, 200)) return "inaccurate"; return distance <= radius ? "inside" : "outside"; }
export function validateAttendanceSequence(events: readonly AttendanceEvent[], requestedType: AttendanceEventType) {
  const last = [...events].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
  if (requestedType === "check_out" && (!last || last.type !== "check_in")) return { valid: false, message: "لا يمكن تسجيل الانصراف قبل تسجيل الحضور." };
  if (requestedType === "check_in" && last?.type === "check_in") return { valid: false, message: "يوجد تسجيل حضور مفتوح بالفعل." };
  if (requestedType === "check_out" && last?.type === "check_out") return { valid: false, message: "تم تسجيل الانصراف بالفعل." };
  return { valid: true, message: "" };
}
export function resolveShiftWorkDate(checkInIso: string, checkOutIso: string) { void checkOutIso; return checkInIso.slice(0, 10); }
export function nextAttendanceAction(events: readonly AttendanceEvent[]): AttendanceEventType { const last = [...events].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]; return last?.type === "check_in" ? "check_out" : "check_in"; }
export function summarizeDays(days: readonly AttendanceDay[]) { return { present: days.filter((d) => d.status === "present").length, late: days.filter((d) => d.status === "late").length, absent: days.filter((d) => d.status === "absent").length, outside: days.filter((d) => d.status === "outside_geofence").length, needsReview: days.filter((d) => d.reviewStatus === "pending").length, missingCheckout: days.filter((d) => d.status === "missing_check_out").length }; }
