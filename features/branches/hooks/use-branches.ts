"use client";

import { useSyncExternalStore } from "react";
import { getBranchesSnapshot, subscribeBranches } from "../services/branch-store";
import type { Branch } from "../types";

const EMPTY_BRANCHES: readonly Branch[] = [];

export function useBranches() {
  return useSyncExternalStore(subscribeBranches, getBranchesSnapshot, () => EMPTY_BRANCHES);
}
