"use client";

import { useSyncExternalStore } from "react";
import { rentalClockStore } from "../services/rental-clock-store";

const ignoreClockUpdates = () => () => undefined;

export function useRentalClock(running = true) {
  return useSyncExternalStore(
    running ? rentalClockStore.subscribe : ignoreClockUpdates,
    running ? rentalClockStore.getSnapshot : rentalClockStore.getServerSnapshot,
    rentalClockStore.getServerSnapshot,
  );
}

