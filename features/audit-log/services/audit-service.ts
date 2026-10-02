import { AUDIT_FIXTURES } from "../fixtures";
import type { AuditEvent, AuditEventInput, AuditSnapshot, AuditValue } from "../types";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";

const secretKey = /password|token|secret|api.?key|card(number)?|payment.?data|image|photo/i;
const phoneKey = /phone|mobile/i;
function redactValue(value: unknown, key = ""): unknown {
  if (secretKey.test(key)) return "[REDACTED]";
  if (phoneKey.test(key) && typeof value === "string") return value.length > 4 ? `${value.slice(0, 3)}••••${value.slice(-2)}` : "••••";
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redactValue(child, childKey)]));
  return value;
}
export function redactAuditValue(value: AuditValue): AuditValue { return value ? redactValue(value) as Record<string, unknown> : null; }

const STORAGE_KEY = "l3bty-local-audit-v1";
const stored = readLocalTestData<{ events: AuditEvent[]; sequence: number }>(STORAGE_KEY, 1, { events: [], sequence: 200 });
let events: readonly AuditEvent[] = stored.events.map((event) => ({ ...event, before: redactAuditValue(event.before), after: redactAuditValue(event.after), changedFields: [...event.changedFields], actorRolesSnapshot: [...event.actorRolesSnapshot] }));
let snapshot: AuditSnapshot = { events };
let sequence = stored.sequence;
const listeners = new Set<() => void>();
const emit = (persist = true) => { snapshot = { events }; if (persist) writeLocalTestData(STORAGE_KEY, 1, { events, sequence }); listeners.forEach((listener) => listener()); };

export function subscribeAudit(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getAuditSnapshot() { return snapshot; }
export function appendAuditEvent(input: AuditEventInput) {
  const existing = events.find((event) => event.idempotencyKey === input.idempotencyKey);
  if (existing) return { event: existing, duplicate: true };
  const event: AuditEvent = { ...input, id: `audit-${sequence}`, eventNumber: `AUD-2026-${String(sequence++).padStart(5, "0")}`, before: redactAuditValue(input.before), after: redactAuditValue(input.after), actorRolesSnapshot: [...input.actorRolesSnapshot], changedFields: [...input.changedFields] };
  events = [event, ...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); emit(); return { event, duplicate: false };
}
export function resetAuditStore() { events = AUDIT_FIXTURES.map((event) => ({ ...event, before: redactAuditValue(event.before), after: redactAuditValue(event.after), changedFields: [...event.changedFields], actorRolesSnapshot: [...event.actorRolesSnapshot] })); sequence = 200; removeLocalTestData(STORAGE_KEY); emit(false); }
