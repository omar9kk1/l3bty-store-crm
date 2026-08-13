export type MoneyString = string;

export function toCents(value: MoneyString | number) {
  const normalized = typeof value === "number" ? value.toFixed(2) : value.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("قيمة مالية غير صحيحة.");
  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

export function fromCents(cents: number): MoneyString {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export const addMoney = (...values: MoneyString[]) => fromCents(values.reduce((sum, value) => sum + toCents(value), 0));
export const subtractMoney = (value: MoneyString, ...deductions: MoneyString[]) => fromCents(toCents(value) - deductions.reduce((sum, item) => sum + toCents(item), 0));
export const multiplyMoney = (value: MoneyString, numerator: number, denominator = 1) => fromCents(Math.round(toCents(value) * numerator / denominator));
export const moneyNumber = (value: MoneyString) => toCents(value) / 100;

