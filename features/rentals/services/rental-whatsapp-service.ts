import { normalizePhone } from "@/features/customers/services/normalize-phone";

export interface RentalInvoiceWhatsAppInput {
  customerName: string;
  customerPhone: string;
  assetName: string;
  rentalNumber: string;
  branchName: string;
  startedAt: string | null;
  endedAt: string | null;
  durationLabel: string;
  totalAmount: number;
  paidAmount: number;
  receiptUrl?: string;
}

export interface RentalReminderWhatsAppInput {
  customerName: string;
  customerPhone: string;
  assetName: string;
  assetNumber: string;
  branchName: string;
  expectedEndAt: string;
}

export interface RentalWhatsAppLinkResult {
  valid: boolean;
  href: string | null;
  message: string;
  internationalPhone: string | null;
}

export interface RentalWhatsAppService {
  buildInvoiceLink(input: RentalInvoiceWhatsAppInput): RentalWhatsAppLinkResult;
  buildReminderLink(input: RentalReminderWhatsAppInput): RentalWhatsAppLinkResult;
  open(result: RentalWhatsAppLinkResult): "opened" | "failed_to_open" | "customer_phone_missing";
}

function toWhatsAppPhone(value: string) {
  const normalized = normalizePhone(value);
  if (!/^01[0125]\d{8}$/.test(normalized)) return null;
  return `20${normalized.slice(1)}`;
}

function localDateTime(value: string | null) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

function resultFor(phone: string, message: string): RentalWhatsAppLinkResult {
  const internationalPhone = toWhatsAppPhone(phone);
  if (!internationalPhone) return { valid: false, href: null, message: "لا يوجد رقم واتساب صالح لهذا العميل", internationalPhone: null };
  return { valid: true, href: `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`, message, internationalPhone };
}

export const browserRentalWhatsAppService: RentalWhatsAppService = {
  buildInvoiceLink(input) {
    const remaining = Math.max(0, input.totalAmount - input.paidAmount);
    const message = [
      `مرحبًا أ/ ${input.customerName}`,
      `هذه فاتورة تأجير ${input.assetName}`,
      "",
      `رقم العملية: ${input.rentalNumber}`,
      `الفرع: ${input.branchName}`,
      `وقت البداية: ${localDateTime(input.startedAt)}`,
      `وقت النهاية: ${localDateTime(input.endedAt)}`,
      `المدة: ${input.durationLabel}`,
      `إجمالي التأجير: ${input.totalAmount.toLocaleString("ar-EG-u-nu-latn")} ج.م`,
      `المدفوع: ${input.paidAmount.toLocaleString("ar-EG-u-nu-latn")} ج.م`,
      `المتبقي: ${remaining.toLocaleString("ar-EG-u-nu-latn")} ج.م`,
      "",
      "شكرًا لاستخدامكم L3BTY.",
      ...(input.receiptUrl ? [input.receiptUrl] : []),
    ].join("\n");
    return resultFor(input.customerPhone, message);
  },
  buildReminderLink(input) {
    const message = [
      `مرحبًا أ/ ${input.customerName}`,
      "متبقي حوالي 5 دقائق على انتهاء وقت تأجير:",
      "",
      `اللعبة: ${input.assetName}`,
      `رقم الأصل: ${input.assetNumber}`,
      `الفرع: ${input.branchName}`,
      `موعد الانتهاء: ${localDateTime(input.expectedEndAt)}`,
      "",
      "يرجى الحضور لاستلام الطفل أو تمديد مدة التأجير عند الحاجة.",
      "شكرًا لكم — L3BTY",
    ].join("\n");
    return resultFor(input.customerPhone, message);
  },
  open(result) {
    if (!result.valid || !result.href) return "customer_phone_missing";
    const opened = window.open(result.href, "_blank", "noopener,noreferrer");
    return opened ? "opened" : "failed_to_open";
  },
};

// Future adapter boundary: a backend implementation can use an approved WhatsApp provider
// without changing message composition or the UI contract above.
