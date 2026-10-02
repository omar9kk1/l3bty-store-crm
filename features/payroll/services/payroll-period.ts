import type { SalaryType } from "../types";

function toLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentPayrollPeriod(salaryType: SalaryType, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  if (salaryType === "weekly") {
    const start = new Date(year, month, today.getDate() - ((today.getDay() + 6) % 7));
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { start: toLocalDate(start), end: toLocalDate(end) };
  }
  if (salaryType === "daily") {
    const date = toLocalDate(today);
    return { start: date, end: date };
  }
  return {
    start: toLocalDate(new Date(year, month, 1)),
    end: toLocalDate(new Date(year, month + 1, 0)),
  };
}

export function getTodayLocalDate(today = new Date()) { return toLocalDate(today); }
