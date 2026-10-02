export type MaintenanceWhatsAppKind = "intake" | "fault_registered" | "estimate" | "approval" | "ready";

export function normalizeMaintenancePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `2${digits}`;
  return null;
}

export function buildMaintenanceWhatsAppUrl(phone: string, kind: MaintenanceWhatsAppKind, reference: string, item: string, amount = 0) {
  const normalized = normalizeMaintenancePhone(phone);
  if (!normalized) return null;
  const messages: Record<MaintenanceWhatsAppKind, string> = {
    intake: `تم استلام ${item} للصيانة. رقم المتابعة ${reference}.`,
    fault_registered: `تم تسجيل العطل الخاص بـ ${item} برقم ${reference}. سيتم فحص اللعبة والتواصل معك في أقرب وقت. شكرًا لتعاملك مع L3BTY.`,
    estimate: `تقدير صيانة ${item} للطلب ${reference} هو ${amount.toLocaleString("ar-EG-u-nu-latn")} ج.م. نرجو تأكيد الموافقة.`,
    approval: `تم تسجيل موافقتكم على صيانة ${item} للطلب ${reference}.`,
    ready: `${item} جاهزة للاستلام. رقم الطلب ${reference}.`,
  };
  return `https://wa.me/${normalized}?text=${encodeURIComponent(messages[kind])}`;
}
