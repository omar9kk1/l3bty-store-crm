import { getSettingsSnapshot } from "@/features/settings/services/settings-store";
import type { Rental, RentalReminderStatus } from "../types";

export interface RentalReminderEvaluation {
  rentalId: string;
  status: RentalReminderStatus;
  remainingSeconds: number | null;
  due: boolean;
}

export interface RentalReminderService {
  evaluate(rental: Rental, referenceIso: string): RentalReminderEvaluation;
  scheduleFiveMinuteReminder(rentalId: string): Promise<void>;
  recordDelivery(rentalId: string, status: RentalReminderStatus): Promise<void>;
  retryFailed(rentalId: string): Promise<void>;
}

export function remainingRentalSeconds(rental: Rental, referenceIso: string) {
  if (rental.durationType === "open_time" || !rental.expectedEndAt) return null;
  return Math.floor((new Date(rental.expectedEndAt).getTime() - new Date(referenceIso).getTime()) / 1000);
}

export function evaluateFiveMinuteReminder(rental: Rental, referenceIso: string): RentalReminderEvaluation {
  const remainingSeconds = remainingRentalSeconds(rental, referenceIso);
  const active = ["active", "near_end"].includes(rental.status);
  const due = active && remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds <= getSettingsSnapshot().settings.reminderMinutes * 60;
  return { rentalId: rental.id, status: due ? "due" : rental.reminderStatus, remainingSeconds, due };
}

// Guaranteed scheduling while the app is closed requires a backend scheduler and a WhatsApp API.
// The current browser Mock evaluates only while the application is running.
