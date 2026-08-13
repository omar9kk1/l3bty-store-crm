export type AttendanceEventType = "check_in" | "check_out";
export type LocationStatus = "inside" | "outside" | "unavailable" | "inaccurate";
export type AttendanceDayStatus = "present" | "late" | "absent" | "missing_check_out" | "outside_geofence" | "needs_review" | "approved_exception";
export type AttendanceReviewStatus = "none" | "pending" | "reviewed";
export type AttendanceExceptionStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AttendanceExceptionType = "camera_unavailable" | "location_unavailable" | "work_outside_geofence" | "forgot_check_in" | "forgot_check_out" | "technical_error" | "other_branch_assignment";
export type AttendanceViewState = "normal" | "loading" | "empty" | "error" | "offline";
export type AttendancePeriod = "today" | "week" | "month";

export interface AttendanceEvent { id: string; employeeId: string; branchId: string; type: AttendanceEventType; capturedAt: string; timezone: "Africa/Cairo"; latitude: number; longitude: number; accuracyMeters: number; distanceFromBranchMeters: number; geofenceRadiusMeters: number; locationStatus: LocationStatus; livePhotoSessionKey: string; source: "browser_live_capture" | "admin_correction"; status: "accepted" | "needs_review"; notes: string; createdAt: string; }
export interface AttendanceCorrection { id: string; attendanceDayId: string; field: "shiftStartedAt" | "shiftEndedAt"; previousValue: string | null; newValue: string; reason: string; correctedBy: string; correctedAt: string; }
export interface AttendanceDay { id: string; employeeId: string; branchId: string; workDate: string; shiftStartedAt: string | null; shiftEndedAt: string | null; checkInEventId: string | null; checkOutEventId: string | null; expectedStartAt: string; expectedEndAt: string; workedMinutes: number; lateMinutes: number; earlyLeaveMinutes: number; status: AttendanceDayStatus; reviewStatus: AttendanceReviewStatus; corrections: readonly AttendanceCorrection[]; }
export interface AttendanceException { id: string; attendanceDayId: string; employeeId: string; branchId: string; type: AttendanceExceptionType; reason: string; employeeNote: string; requestedAt: string; evidence: string | null; taskReference: string | null; status: AttendanceExceptionStatus; reviewedBy: string | null; reviewedAt: string | null; reviewerNote: string | null; }
export interface AttendanceAuditEvent { id: string; entityId: string; action: "captured" | "corrected" | "exception_requested" | "exception_approved" | "exception_rejected" | "more_info_requested"; reason: string; at: string; by: string; }
export interface CaptureInput { employeeId: string; branchId: string; type: AttendanceEventType; latitude: number; longitude: number; accuracyMeters: number; distanceFromBranchMeters: number; geofenceRadiusMeters: number; livePhotoSessionKey: string; }
export interface AttendanceFilters { date: string; from: string; to: string; branch: string; employee: string; role: string; status: AttendanceDayStatus | "all"; review: AttendanceReviewStatus | "all"; sort: "recent" | "employee"; }
