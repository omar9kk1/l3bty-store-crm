"use client";

import { useSyncExternalStore } from "react";
import { getCustomersSnapshot, subscribeCustomers } from "../services/customer-store";

export function useCustomers() {
  return useSyncExternalStore(
    subscribeCustomers,
    getCustomersSnapshot,
    getCustomersSnapshot,
  );
}
