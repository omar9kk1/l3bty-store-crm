import { NOTIFICATION_FIXTURES } from "../fixtures";
import type { AppNotification, NotificationInput, NotificationsSnapshot } from "../types";

const NOW = "2026-08-08T15:30:00.000Z";
let notifications: readonly AppNotification[] = NOTIFICATION_FIXTURES.map((item) => ({ ...item, metadata: { ...item.metadata } }));
let snapshot: NotificationsSnapshot = { notifications };
let sequence = 100;
const listeners = new Set<() => void>();
const emit = () => { snapshot = { notifications }; listeners.forEach((listener) => listener()); };

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
export function resetNotificationStore() { notifications = NOTIFICATION_FIXTURES.map((item) => ({ ...item, metadata: { ...item.metadata } })); sequence = 100; emit(); }
