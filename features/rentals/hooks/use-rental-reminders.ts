"use client";

import { useEffect } from "react";
import { evaluateRentalReminders } from "../services/rental-store";

export function useRentalReminderEvaluation() {
  useEffect(() => { evaluateRentalReminders(); }, []);
}
