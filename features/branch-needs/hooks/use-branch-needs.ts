"use client";

import { useSyncExternalStore } from "react";
import { getBranchNeedsSnapshot, subscribeBranchNeeds } from "../services/branch-needs-store";

const serverSnapshot = { requests: [] };

export function useBranchNeeds() {
  return useSyncExternalStore(subscribeBranchNeeds, getBranchNeedsSnapshot, () => serverSnapshot);
}
