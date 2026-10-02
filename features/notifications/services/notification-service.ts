import { NOTIFICATION_FIXTURES } from "../fixtures";
import type { AppNotification, NotificationInput, NotificationsSnapshot } from "../types";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";

const NOW = "2026-08-08T15:30:00.000Z";
const STORAGE_KEY = "l3bty-local-notifications-v1";
const stored = readLocalTestData<{ notifications: AppNotification[]; sequence: number }>(STORAGE_KEY, 1, { notifications: [], sequence: 100 });
let notifications: readonly AppNotification[] = stored.notifications.map((item) => ({ ...item, metadata: { ...item.metadata } }));
let snapshot: NotificationsSnapshot = { notifications };
let sequence = stored.sequence;
const listeners = new Set<() => void>();
const emit = (persist = true) => { snapshot = { notifications }; if (persist) writeLocalTestData(STORAGE_KEY, 1, { notifications, sequence }); listeners.forEach((listener) => listener()); };

export function subscribeNotifications(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getNotificationsSnapshot() { return snapshot; }
export function publishNotification(input: NotificationInput) {
  const existing = notifications.find((item) => item.idempotencyKey === input.idempotencyKey);
  if (existing) return { notification: existing, duplicate: true };
  const item: AppNotification = { ...input, id: `notification-${sequence}`, notificationNumber: `NTF-2026-${String(sequence++).padStart(4, "0")}`, status: input.status ?? "unread", readAt: input.readAt ?? null, actedAt: input.actedAt ?? null, metadata: { ...input.metadata } };
  notifications = [item, ...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); emit();
  return { notification: item, duplicate: false };
}
export function markNotificationRead(id: string, recipientUserId: string) {
  let changed = false;
  notifications = notifications.map((item) => item.id === id && item.recipientUserId === recipientUserId ? (changed = true, { ...item, status: "read", readAt: item.readAt ?? NOW }) : item); if (changed) emit(); return changed;
}
export function markNotificationUnread(id: string, recipientUserId: string) {
  let changed = false;
  notifications = notifications.map((item) => item.id === id && item.recipientUserId === recipientUserId ? (changed = true, { ...item, status: "unread", readAt: null }) : item); if (changed) emit(); return changed;
}
export function dismissNotification(id: string, recipientUserId: string) {
  let changed = false;
  notifications = notifications.map((item) => item.id === id && item.recipientUserId === recipientUserId ? (changed = true, { ...item, status: "dismissed" }) : item); if (changed) emit(); return changed;
}
export function markAllNotificationsRead(recipientUserId: string) {
  notifications = notifications.map((item) => item.recipientUserId === recipientUserId && item.status === "unread" ? { ...item, status: "read", readAt: NOW } : item); emit();
}
export function markNotificationActedByReference(referenceType: string, referenceId: string, recipientUserId: string) {
  let changed = false;
  notifications = notifications.map((item) => item.referenceType === referenceType && item.referenceId === referenceId && item.recipientUserId === recipientUserId && !["acted", "dismissed", "expired"].includes(item.status) ? (changed = true, { ...item, status: "acted", readAt: item.readAt ?? NOW, actedAt: NOW }) : item);
  if (changed) emit();
  return changed;
}
export function resetNotificationStore() { notifications = NOTIFICATION_FIXTURES.map((item) => ({ ...item, metadata: { ...item.metadata } })); sequence = 100; removeLocalTestData(STORAGE_KEY); emit(false); }
