"use client";
import { useSyncExternalStore } from "react";
import { getMaintenanceSnapshot, subscribeMaintenanceStore } from "../services/maintenance-store";
export function useMaintenance(){return useSyncExternalStore(subscribeMaintenanceStore,getMaintenanceSnapshot,getMaintenanceSnapshot);}
