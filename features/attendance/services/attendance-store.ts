import { appendAuditEvent } from "@/features/audit-log/services/audit-service";
import { getBranchesSnapshot } from "@/features/branches/services/branch-store";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";
import { ATTENDANCE_DAY_FIXTURES, ATTENDANCE_EVENT_FIXTURES, ATTENDANCE_EXCEPTION_FIXTURES } from "../fixtures";
import type { AttendanceAuditEvent, AttendanceCorrection, AttendanceDay, AttendanceEvent, AttendanceException, CaptureInput } from "../types";
import { getRelevantAttendanceEvents, resolveLocationStatus, validateAttendanceSequence } from "./attendance-rules";
import { getEgyptNowIso } from "./attendance-time";

const STORAGE_KEY = "l3bty-local-attendance-v1";
const LEGACY_FIXED_NOW = "2026-08-06T16:30:00+03:00";
type AttendanceStoreData = { events: AttendanceEvent[]; days: AttendanceDay[]; exceptions: AttendanceException[]; audits: AttendanceAuditEvent[]; sequence: number };

const stored = readLocalTestData<AttendanceStoreData>(STORAGE_KEY, 1, { events: [], days: [], exceptions: [], audits: [], sequence: 20 });
const migrationNow = getEgyptNowIso();
const isOrphanedLegacyCapture = (event: AttendanceEvent) => event.source === "browser_live_capture" && event.capturedAt === LEGACY_FIXED_NOW && !stored.days.some((day) => day.checkInEventId === event.id || day.checkOutEventId === event.id);
const repairedLegacyCapture = stored.events.some(isOrphanedLegacyCapture);
let events: readonly AttendanceEvent[] = stored.events.map((item) => isOrphanedLegacyCapture(item) ? { ...item, capturedAt: migrationNow, createdAt: migrationNow } : { ...item });
let days: readonly AttendanceDay[] = stored.days.map((item) => ({ ...item, corrections: [...item.corrections] }));
let exceptions: readonly AttendanceException[] = stored.exceptions.map((item) => ({ ...item }));
let audits: readonly AttendanceAuditEvent[] = stored.audits;
let sequence = stored.sequence;

function minutesBetween(start: string, end: string) { return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)); }
function addOneDay(date: string) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10); }
function scheduleForEvent(event: AttendanceEvent) {
  const branch = getBranchesSnapshot().find((item) => item.id === event.branchId);
  const hours = branch?.workingHours[0];
  const offset = event.capturedAt.slice(-6);
  const opensAt = hours?.opensAt ?? event.capturedAt.slice(11, 16);
  const closesAt = hours?.closesAt ?? opensAt;
  const workDate = event.capturedAt.slice(0, 10);
  const endDate = hours?.crossesMidnight || closesAt < opensAt ? addOneDay(workDate) : workDate;
  return { workDate, expectedStartAt: `${workDate}T${opensAt}:00${offset}`, expectedEndAt: `${endDate}T${closesAt}:00${offset}` };
}

function applyEventToDays(currentDays: readonly AttendanceDay[], event: AttendanceEvent): readonly AttendanceDay[] {
  if (event.type === "check_in") {
    if (currentDays.some((day) => day.checkInEventId === event.id)) return currentDays;
    const schedule = scheduleForEvent(event);
    const lateMinutes = minutesBetween(schedule.expectedStartAt, event.capturedAt);
    const nextDay: AttendanceDay = {
      id: `attendance-${event.id}`, employeeId: event.employeeId, branchId: event.branchId, workDate: schedule.workDate,
      shiftStartedAt: event.capturedAt, shiftEndedAt: null, checkInEventId: event.id, checkOutEventId: null,
      expectedStartAt: schedule.expectedStartAt, expectedEndAt: schedule.expectedEndAt, workedMinutes: 0, lateMinutes, earlyLeaveMinutes: 0,
      status: event.locationStatus === "outside" ? "outside_geofence" : lateMinutes > 0 ? "late" : "present",
      reviewStatus: event.status === "needs_review" ? "pending" : "none", corrections: [],
    };
    return [nextDay, ...currentDays];
  }
  if (currentDays.some((day) => day.checkOutEventId === event.id)) return currentDays;
  const openDay = currentDays.find((day) => day.employeeId === event.employeeId && day.shiftStartedAt && !day.shiftEndedAt);
  if (!openDay?.shiftStartedAt) return currentDays;
  const checkInEvent = events.find((item) => item.id === openDay.checkInEventId);
  const outside = event.locationStatus === "outside" || checkInEvent?.locationStatus === "outside";
  return currentDays.map((day): AttendanceDay => day.id !== openDay.id ? day : {
    ...day, shiftEndedAt: event.capturedAt, checkOutEventId: event.id,
    workedMinutes: minutesBetween(openDay.shiftStartedAt!, event.capturedAt),
    earlyLeaveMinutes: minutesBetween(event.capturedAt, openDay.expectedEndAt),
    status: outside ? "outside_geofence" : day.lateMinutes > 0 ? "late" : "present",
    reviewStatus: outside || event.status === "needs_review" ? "pending" : day.reviewStatus,
  });
}

for (const event of [...events].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))) days = applyEventToDays(days, event);
if (repairedLegacyCapture && typeof window !== "undefined") writeLocalTestData(STORAGE_KEY, 1, { events, days, exceptions, audits, sequence });

let snapshot = { events, days, exceptions, audits };
const listeners = new Set<() => void>();
function emit(persist = true) { snapshot = { events, days, exceptions, audits }; if (persist) writeLocalTestData(STORAGE_KEY, 1, { events, days, exceptions, audits, sequence }); listeners.forEach((listener) => listener()); }
function audit(entityId: string, action: AttendanceAuditEvent["action"], reason: string, by: string) {
  const now = getEgyptNowIso();
  const localId = `attendance-audit-${sequence++}`;
  audits = [{ id: localId, entityId, action, reason, at: now, by }, ...audits];
  const role = by.includes("manager") ? "manager" : by.includes("technician") ? "maintenance_technician" : by.includes("rental") ? "rental_maintenance_employee" : "sales_employee";
  appendAuditEvent({ actorUserId: by.replace("employee-", "user-"), actorEmployeeId: by, actorRolesSnapshot: [role], branchId: "all", action: `attendance_${action}`, category: "attendance", entityType: "attendance", entityId, referenceNumber: entityId, severity: action === "corrected" ? "important" : "notice", reason, before: null, after: { action }, changedFields: [], source: "mobile_web", requestId: `req-${localId}`, idempotencyKey: `attendance:${localId}`, ipAddressMock: "192.0.2.20", userAgentSummaryMock: "Mobile Web · Mock", createdAt: new Date(now).toISOString() });
}

export function subscribeAttendance(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getAttendanceSnapshot() { return snapshot; }

export function captureAttendance(input: CaptureInput) {
  const capturedAt = getEgyptNowIso();
  const employeeEvents = getRelevantAttendanceEvents(events, days, input.employeeId, capturedAt.slice(0, 10));
  const sequenceResult = validateAttendanceSequence(employeeEvents, input.type);
  if (!sequenceResult.valid) return sequenceResult;
  const locationStatus = resolveLocationStatus(input.distanceFromBranchMeters, input.geofenceRadiusMeters, input.accuracyMeters);
  if (locationStatus === "unavailable" || locationStatus === "inaccurate") return { valid: false, message: "الموقع غير متاح بالدقة المطلوبة." };
  const id = `evt-captured-${sequence++}`;
  const next: AttendanceEvent = { id, ...input, capturedAt, timezone: "Africa/Cairo", locationStatus, source: "browser_live_capture", status: locationStatus === "inside" ? "accepted" : "needs_review", notes: "مرجع جلسة التقاط مباشر — لا تُحفظ الصورة بشكل دائم.", createdAt: capturedAt };
  events = [next, ...events];
  days = applyEventToDays(days, next);
  audit(id, "captured", `تسجيل ${input.type === "check_in" ? "حضور" : "انصراف"}`, input.employeeId);
  emit();
  return { valid: true, message: "تم التسجيل بنجاح.", event: next };
}

export function requestAttendanceException(input: Omit<AttendanceException, "id" | "requestedAt" | "status" | "reviewedBy" | "reviewedAt" | "reviewerNote">) {
  const item: AttendanceException = { ...input, id: `exception-${sequence++}`, requestedAt: getEgyptNowIso(), status: "pending", reviewedBy: null, reviewedAt: null, reviewerNote: null };
  exceptions = [item, ...exceptions]; audit(item.id, "exception_requested", item.reason, item.employeeId); emit(); return item;
}
export function reviewAttendanceException(id: string, decision: "approved" | "rejected" | "more_info", note: string, reviewer: string) {
  if (!note.trim()) return { valid: false, message: "الملاحظة الإدارية مطلوبة." };
  exceptions = exceptions.map((item) => item.id === id ? { ...item, status: decision === "more_info" ? "pending" : decision, reviewedBy: reviewer, reviewedAt: getEgyptNowIso(), reviewerNote: note.trim() } : item);
  audit(id, decision === "approved" ? "exception_approved" : decision === "rejected" ? "exception_rejected" : "more_info_requested", note, reviewer); emit(); return { valid: true, message: "تم حفظ القرار وتسجيله." };
}
export function correctAttendanceDay(id: string, field: AttendanceCorrection["field"], newValue: string, reason: string, by: string) {
  if (!reason.trim()) return { valid: false, message: "سبب التصحيح إلزامي." };
  let correction: AttendanceCorrection | undefined;
  days = days.map((item) => { if (item.id !== id) return item; correction = { id: `correction-${sequence++}`, attendanceDayId: id, field, previousValue: item[field], newValue, reason: reason.trim(), correctedBy: by, correctedAt: getEgyptNowIso() }; return { ...item, [field]: newValue, corrections: [correction, ...item.corrections], reviewStatus: "reviewed" }; });
  if (correction) { audit(id, "corrected", reason, by); emit(); return { valid: true, message: "تم حفظ التصحيح دون حذف الحدث الأصلي.", correction }; }
  return { valid: false, message: "السجل غير موجود." };
}
export function resetAttendanceStore() { events = ATTENDANCE_EVENT_FIXTURES.map((item) => ({ ...item })); days = ATTENDANCE_DAY_FIXTURES.map((item) => ({ ...item, corrections: [...item.corrections] })); exceptions = ATTENDANCE_EXCEPTION_FIXTURES.map((item) => ({ ...item })); audits = []; sequence = 20; removeLocalTestData(STORAGE_KEY); emit(false); }
