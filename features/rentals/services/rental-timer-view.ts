import type { Rental } from "../types";
import { formatTimer, isRentalEndingSoon } from "./rental-rules";

export type RentalTimerTone = "success" | "danger" | "neutral";
export type RentalTimerView = {
  label: string;
  value: string;
  tone: RentalTimerTone;
  progress: number;
  mode: "fixed" | "open" | "closed" | "decision";
};

const BILLING_INTERVAL_SECONDS = 15 * 60;

export function isRentalAwaitingDecision(rental: Rental, referenceMs: number) {
  return Boolean(
    rental.startedAt
    && rental.durationType !== "open_time"
    && rental.expectedEndAt
    && rental.status !== "completed"
    && rental.status !== "cancelled"
    && referenceMs > new Date(rental.expectedEndAt).getTime()
  );
}

function intervalProgress(seconds: number) {
  const elapsedInInterval = seconds % BILLING_INTERVAL_SECONDS;
  return (elapsedInInterval / BILLING_INTERVAL_SECONDS) * 100;
}

export function getRentalTimerView(rental: Rental, referenceMs: number): RentalTimerView {
  if (!rental.startedAt) {
    return {
      label: rental.status === "cancelled" ? "ملغي قبل البدء" : "لم يبدأ",
      value: "—",
      tone: "neutral",
      progress: 0,
      mode: "closed",
    };
  }

  const startedMs = new Date(rental.startedAt).getTime();
  if (rental.status === "completed") {
    const endMs = rental.closedAt ? new Date(rental.closedAt).getTime() : referenceMs;
    return {
      label: "إجمالي التشغيل",
      value: formatTimer(Math.max(0, Math.floor((endMs - startedMs) / 1000))),
      tone: "neutral",
      progress: 100,
      mode: "closed",
    };
  }

  if (rental.durationType === "open_time" || !rental.expectedEndAt) {
    const elapsedSeconds = Math.max(0, Math.floor((referenceMs - startedMs) / 1000));
    return {
      label: "وقت مستخدم",
      value: formatTimer(elapsedSeconds),
      tone: "success",
      progress: intervalProgress(elapsedSeconds),
      mode: "open",
    };
  }

  const expectedEndMs = new Date(rental.expectedEndAt).getTime();
  const totalSeconds = Math.max(1, Math.floor((expectedEndMs - startedMs) / 1000));
  const remainingSeconds = Math.floor((expectedEndMs - referenceMs) / 1000);
  if (remainingSeconds >= 0) {
    return {
      label: "متبقي",
      value: formatTimer(remainingSeconds),
      tone: isRentalEndingSoon(remainingSeconds) ? "danger" : "success",
      progress: Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100)),
      mode: "fixed",
    };
  }

  return {
    label: "انتهى الوقت",
    value: "00:00:00",
    tone: "danger",
    progress: 0,
    mode: "decision",
  };
}
