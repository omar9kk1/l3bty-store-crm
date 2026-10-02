"use client";
import { useSyncExternalStore } from "react";
import { getEmployeesSnapshot, subscribeEmployees } from "../services/employee-store";
import type { Employee } from "../types";

const EMPTY_EMPLOYEES: readonly Employee[] = [];
export function useEmployees() { return useSyncExternalStore(subscribeEmployees, getEmployeesSnapshot, () => EMPTY_EMPLOYEES); }
