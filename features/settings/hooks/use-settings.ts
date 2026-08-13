"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SYSTEM_SETTINGS } from "../fixtures";
import { getSettingsSnapshot, subscribeSettingsStore } from "../services/settings-store";

const serverSnapshot = {
  settings: DEFAULT_SYSTEM_SETTINGS,
  audits: [],
  updatedAt: "2026-08-08T13:30:00+03:00",
  updatedBy: "employee-owner",
};

export function useSettings() {
  return useSyncExternalStore(subscribeSettingsStore, getSettingsSnapshot, () => serverSnapshot);
}