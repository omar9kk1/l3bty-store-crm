"use client";
import { useSyncExternalStore } from "react";
import { getNotificationsSnapshot, subscribeNotifications } from "../services/notification-service";
const serverSnapshot = { notifications: [] as const };
export function useNotifications() { return useSyncExternalStore(subscribeNotifications, getNotificationsSnapshot, () => serverSnapshot); }
