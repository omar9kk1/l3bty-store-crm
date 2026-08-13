"use client";
import { useSyncExternalStore } from "react";
import { getAuditSnapshot, subscribeAudit } from "../services/audit-service";
const serverSnapshot = { events: [] as const };
export function useAudit() { return useSyncExternalStore(subscribeAudit, getAuditSnapshot, () => serverSnapshot); }
