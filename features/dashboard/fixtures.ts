import type { AlertItem, BranchPerformance, RentalRow, StockAlert } from "./types";
import { BRANCH_FIXTURES } from "@/mock-data/branches";

const branchPerformanceValues: Record<string, Pick<BranchPerformance, "sales" | "rental" | "maintenance" | "total">> = {
  main: { sales: 28400, rental: 12600, maintenance: 7400, total: 48400 },
  "branch-2": { sales: 19800, rental: 9800, maintenance: 5200, total: 34800 },
  "branch-3": { sales: 15600, rental: 7600, maintenance: 4100, total: 27300 },
  workshop: { sales: 0, rental: 0, maintenance: 11300, total: 11300 },
};

export const DASHBOARD_BRANCH_FIXTURES: readonly BranchPerformance[] = BRANCH_FIXTURES.map((branch) => ({
  id: branch.id,
  name: branch.name,
  code: branch.code,
  ...branchPerformanceValues[branch.id],
}));

export const ACTIVE_RENTALS_FIXTURES: readonly RentalRow[] = [
  { id: "R-1042", asset: "عربية دريفت كهربائية", code: "AST-0001", customer: "محمود سامي", clock: "00:05:00", status: "متبقي 5 دقائق", amount: 280 },
  { id: "R-1041", asset: "دراجة أطفال كهربائية", code: "RA-BK-021", customer: "سارة أحمد", clock: "00:24:18", status: "نشط", amount: 190 },
  { id: "R-1039", asset: "سيارة أطفال رباعية", code: "RA-CR-009", customer: "عمر خالد", clock: "+00:06:12", status: "وقت إضافي", amount: 340 },
];

export const STOCK_FIXTURES: readonly StockAlert[] = [
  { id: "S-1", name: "لعبة سباق سيارات للأطفال", category: "sale_game", branch: "الفرع الرئيسي", current: "3", minimum: "6", severity: "مرتفع" },
  { id: "S-2", name: "ذراع تحكم لاسلكي", category: "spare_part", branch: "فرع 2", current: "2", minimum: "5", severity: "متوسط" },
  { id: "S-3", name: "بطارية سيارة أطفال 12V", category: "spare_part", branch: "الورشة المركزية", current: "1", minimum: "4", severity: "مرتفع" },
  { id: "S-4", name: "سكوتر كهربائي RA-SC-018", category: "rental_asset", branch: "فرع 3", current: "توقف تشغيلي", minimum: "فحص مطلوب", severity: "متوسط" },
];

export const MANAGEMENT_ALERTS: readonly AlertItem[] = [
  { id: "A-1", title: "مصروف يحتاج اعتمادًا", reference: "EXP-204", branch: "فرع 2", time: "منذ 8 دقائق", status: "بانتظار الاعتماد", href: "/expenses", unread: true },
  { id: "A-3", title: "استثناء حضور", reference: "ATT-118", branch: "فرع 3", time: "منذ 31 دقيقة", status: "جديد", href: "/attendance", unread: false },
  { id: "A-4", title: "تحويل مخزون", reference: "TR-088", branch: "الورشة المركزية", time: "منذ ساعة", status: "في الانتظار", href: "/inventory", unread: true },
];

export const SALES_ALERTS: readonly AlertItem[] = [
  { id: "SA-1", title: "مخزون لعبة منخفض", reference: "STK-044", branch: "الفرع الحالي", time: "منذ 12 دقيقة", status: "مرتفع", href: "/inventory", unread: true },
  { id: "SA-2", title: "مرتجع يحتاج اعتمادًا", reference: "RET-012", branch: "الفرع الحالي", time: "منذ 26 دقيقة", status: "معلق", href: "/sales/pos", unread: false },
];

export const RENTAL_ALERTS: readonly AlertItem[] = [
  { id: "RA-1", title: "تأجير اقترب من الانتهاء", reference: "R-1042", branch: "الفرع الحالي", time: "منذ دقيقتين", status: "تنبيه", href: "/rentals", unread: true },
  { id: "RA-2", title: "طلب صيانة تغيرت حالته", reference: "M-302", branch: "الفرع الحالي", time: "منذ 18 دقيقة", status: "قيد الفحص", href: "/maintenance", unread: true },
];

export const TECH_ALERTS: readonly AlertItem[] = [
  { id: "TA-1", title: "بلاغ عطل جديد", reference: "FLT-092", branch: "الفرع الرئيسي", time: "منذ 4 دقائق", status: "جديد", href: "/maintenance", unread: true },
  { id: "TA-2", title: "أمر أعيد تعيينه", reference: "M-298", branch: "الورشة المركزية", time: "منذ 22 دقيقة", status: "مسند إليك", href: "/maintenance", unread: true },
  { id: "TA-3", title: "قطعة وصلت للورشة", reference: "PRT-061", branch: "الورشة المركزية", time: "منذ 47 دقيقة", status: "متاح", href: "/inventory", unread: false },
];
