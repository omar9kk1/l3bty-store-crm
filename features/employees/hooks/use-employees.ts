"use client";
import { useSyncExternalStore } from "react";
import { getEmployeesSnapshot, subscribeEmployees } from "../services/employee-store";
import { EMPLOYEE_FIXTURES } from "../fixtures";

export function useEmployees() { return useSyncExternalStore(subscribeEmployees, getEmployeesSnapshot, () => EMPLOYEE_FIXTURES); }
