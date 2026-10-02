import type { LocalDatabaseSnapshot } from "./local-data-contract";

export function getLocalDatabaseSnapshots(): LocalDatabaseSnapshot[] {
  return [];
}

export function putLocalDatabaseSnapshot() {
  // A Sites preview keeps its test records inside the visitor's browser.
}

export function getLocalDatabasePath() {
  return "browser-preview";
}
