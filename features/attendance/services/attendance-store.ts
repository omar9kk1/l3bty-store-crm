import { ATTENDANCE_DAY_FIXTURES, ATTENDANCE_EVENT_FIXTURES, ATTENDANCE_EXCEPTION_FIXTURES } from "../fixtures";
import { resolveLocationStatus, validateAttendanceSequence } from "./attendance-rules";
import type { AttendanceAuditEvent, AttendanceCorrection, AttendanceDay, AttendanceEvent, AttendanceException, CaptureInput } from "../types";
import { appendAuditEvent } from "@/features/audit-log/services/audit-service";

let events: readonly AttendanceEvent[] = ATTENDANCE_EVENT_FIXTURES.map((item) => ({ ...item }));
let days: readonly AttendanceDay[] = ATTENDANCE_DAY_FIXTURES.map((item) => ({ ...item, corrections: [...item.corrections] }));
let exceptions: readonly AttendanceException[] = ATTENDANCE_EXCEPTION_FIXTURES.map((item) => ({ ...item }));
let audits: readonly AttendanceAuditEvent[] = [];
let snapshot = { events, days, exceptions, audits };
let sequence = 20;
const listeners = new Set<() => void>();
const MOCK_NOW = "2026-08-06T16:30:00+03:00";
function emit() { snapshot = { events, days, exceptions, audits }; listeners.forEach((listener) => listener()); }
function audit(entityId: string, action: AttendanceAuditEvent["action"], reason: string, by: string) {
  const localId = `attendance-audit-${sequence++}`;
  audits = [{ id: localId, entityId, action, reason, at: MOCK_NOW, by }, ...audits];
  const role = by.includes("manager") ? "manager" : by.includes("technician") ? "maintenance_technician" : by.includes("rental") ? "rental_maintenance_employee" : "sales_employee";
  appendAuditEvent({ actorUserId: by.replace("employee-", "user-"), actorEmployeeId: by, actorRolesSnapshot: [role], branchId: "all", action: `attendance_${action}`, category: "attendance", entityType: "attendance", entityId, referenceNumber: entityId, severity: action === "corrected" ? "important" : "notice", reason, before: null, after: { action }, changedFields: [], source: "mobile_web", requestId: `req-${localId}`, idempotencyKey: `attendance:${localId}`, ipAddressMock: "192.0.2.20", userAgentSummaryMock: "Mobile Web · Mock", createdAt: "2026-08-06T13:30:00.000Z" });
}
export function subscribeAttendance(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getAttendanceSnapshot() { return snapshot; }

export function captureAttendance(input: CaptureInput) {
  const employeeEvents = events.filter((item) => item.employeeId === input.employeeId);
  const sequenceResult = validateAttendanceSequence(employeeEvents, input.type); if (!sequenceResult.valid) return sequenceResult;
  const locationStatus = resolveLocationStatus(input.distanceFromBranchMeters, input.geofenceRadiusMeters, input.accuracyMeters);
  if (locationStatus === "unavailable" || locationStatus === "inaccurate") return { valid: false, message: "الموقع غير متاح بالدقة المطلوبة." };
  const id = `evt-captured-${sequence++}`; const capturedAt = MOCK_NOW;
  const next: AttendanceEvent = { id, ...input, capturedAt, timezone: "Africa/Cairo", locationStatus, source: "browser_live_capture", status: locationStatus === "inside" ? "accepted" : "needs_review", notes: "Session Mock Reference — لا تخزين دائم للصورة.", createdAt: capturedAt };
  events = [next, ...events]; audit(id, "captured", `تسجيل ${input.type}`, input.employeeId); emit(); return { valid: true, message: "تم التسجيل بنجاح داخل Mock State.", event: next };
}
export function requestAttendanceException(input: Omit<AttendanceException, "id" | "requestedAt" | "status" | "reviewedBy" | "reviewedAt" | "reviewerNote">) {
  const item: AttendanceException = { ...input, id: `exception-${sequence++}`, requestedAt: MOCK_NOW, status: "pending", reviewedBy: null, reviewedAt: null, reviewerNote: null };
  exceptions = [item, ...exceptions]; audit(item.id, "exception_requested", item.reason, item.employeeId); emit(); return item;
}
export function reviewAttendanceException(id: string, decision: "approved" | "rejected" | "more_info", note: string, reviewer: string) {
  if (!note.trim()) return { valid: false, message: "الملاحظة الإدارية مطلوبة." };
  exceptions = exceptions.map((item) => item.id === id ? { ...item, status: decision === "more_info" ? "pending" : decision, reviewedBy: reviewer, reviewedAt: MOCK_NOW, reviewerNote: note.trim() } : item);
  audit(id, decision === "approved" ? "exception_approved" : decision === "rejected" ? "exception_rejected" : "more_info_requested", note, reviewer); emit(); return { valid: true, message: "تم حفظ القرار وتسجيل Mock Audit Event." };
}
export function correctAttendanceDay(id: string, field: AttendanceCorrection["field"], newValue: string, reason: string, by: string) {
  if (!reason.trim()) return { valid: false, message: "سبب التصحيح إلزامي." };
  let correction: AttendanceCorrection | undefined;
  days = days.map((item) => { if (item.id !== id) return item; correction = { id: `correction-${sequence++}`, attendanceDayId: id, field, previousValue: item[field], newValue, reason: reason.trim(), correctedBy: by, correctedAt: MOCK_NOW }; return { ...item, [field]: newValue, corrections: [correction, ...item.corrections], reviewStatus: "reviewed" }; });
  if (correction) { audit(id, "corrected", reason, by); emit(); return { valid: true, message: "تم حفظ التصحيح دون حذف الحدث الأصلي.", correction }; }
  return { valid: false, message: "السجل غير موجود." };
}
export function resetAttendanceStore() { events = ATTENDANCE_EVENT_FIXTURES.map((item) => ({ ...item })); days = ATTENDANCE_DAY_FIXTURES.map((item) => ({ ...item, corrections: [...item.corrections] })); exceptions = ATTENDANCE_EXCEPTION_FIXTURES.map((item) => ({ ...item })); audits = []; sequence = 20; emit(); }
