export const rentalPaymentLabels = {
  cash: "نقدي",
  card: "بطاقة",
  wallet: "محفظة",
} as const;

export function rentalPaymentLabel(method: keyof typeof rentalPaymentLabels) {
  return rentalPaymentLabels[method];
}
