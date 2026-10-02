"use client";
import { useEffect, useSyncExternalStore } from "react";
import { syncMaintenanceNotifications } from "@/features/maintenance/services/maintenance-store";
import { getNotificationsSnapshot, subscribeNotifications } from "../services/notification-service";
const serverSnapshot = { notifications: [] as const };
export function useNotifications() {
  useEffect(() => { syncMaintenanceNotifications(); }, []);
  return useSyncExternalStore(subscribeNotifications, getNotificationsSnapshot, () => serverSnapshot);
}
