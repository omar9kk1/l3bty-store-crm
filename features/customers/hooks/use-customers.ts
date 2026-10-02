"use client";

import { useSyncExternalStore } from "react";
import { getCustomerDeleteRequestsSnapshot, getCustomersSnapshot, subscribeCustomers } from "../services/customer-store";
import type { Customer, CustomerDeleteRequest } from "../types";

const EMPTY_CUSTOMERS: readonly Customer[] = [];
const EMPTY_DELETE_REQUESTS: readonly CustomerDeleteRequest[] = [];

export function useCustomers() {
  return useSyncExternalStore(
    subscribeCustomers,
    getCustomersSnapshot,
    () => EMPTY_CUSTOMERS,
  );
}

export function useCustomerDeleteRequests() {
  return useSyncExternalStore(
    subscribeCustomers,
    getCustomerDeleteRequestsSnapshot,
    () => EMPTY_DELETE_REQUESTS,
  );
}
