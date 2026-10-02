const EGYPT_TIME_ZONE = "Africa/Cairo";

function egyptParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EGYPT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getEgyptDate(value = new Date()) {
  const parts = egyptParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getEgyptNowIso(value = new Date()) {
  const parts = egyptParts(value);
  const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  const offsetMinutes = Math.round((localAsUtc - value.getTime()) / 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, "0")}:${String(absoluteOffset % 60).padStart(2, "0")}`;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

export function getAttendancePeriodStart(period: "today" | "week" | "month", referenceDate = getEgyptDate()) {
  if (period === "today") return referenceDate;
  const [year, month, day] = referenceDate.split("-").map(Number);
  if (period === "month") return `${year}-${String(month).padStart(2, "0")}-01`;
  const date = new Date(Date.UTC(year, month - 1, day));
  const daysSinceSaturday = (date.getUTCDay() + 1) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceSaturday);
  return date.toISOString().slice(0, 10);
}
