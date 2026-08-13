"use client";

import { useSyncExternalStore } from "react";
import { getBranchesSnapshot, subscribeBranches } from "../services/branch-store";

export function useBranches() {
  return useSyncExternalStore(subscribeBranches, getBranchesSnapshot, getBranchesSnapshot);
}
