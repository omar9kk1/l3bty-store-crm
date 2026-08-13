export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(4);
  if (digits.startsWith("20") && digits.length > 11) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}
