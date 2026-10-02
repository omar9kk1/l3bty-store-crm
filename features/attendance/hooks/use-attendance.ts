"use client";
import { useSyncExternalStore } from "react";
import { getAttendanceSnapshot, subscribeAttendance } from "../services/attendance-store";
const serverSnapshot = { events: [], days: [], exceptions: [], audits: [] };
export function useAttendance() { return useSyncExternalStore(subscribeAttendance, getAttendanceSnapshot, () => serverSnapshot); }
