"use client";
import { useSyncExternalStore } from "react";
import { ATTENDANCE_DAY_FIXTURES, ATTENDANCE_EVENT_FIXTURES, ATTENDANCE_EXCEPTION_FIXTURES } from "../fixtures";
import { getAttendanceSnapshot, subscribeAttendance } from "../services/attendance-store";
const serverSnapshot = { events: ATTENDANCE_EVENT_FIXTURES, days: ATTENDANCE_DAY_FIXTURES, exceptions: ATTENDANCE_EXCEPTION_FIXTURES, audits: [] };
export function useAttendance() { return useSyncExternalStore(subscribeAttendance, getAttendanceSnapshot, () => serverSnapshot); }
