import type { AppNotification, NotificationCategory, NotificationPriority } from "./types";

type Seed = [string, string, string, NotificationCategory, NotificationPriority, string, string, string, string, string, string];
const seeds: readonly Seed[] = [
  ["owner-report", "user-owner", "employee-owner", "report", "high", "تقرير جديد من المدير", "وصلت نسخة أسبوعية ثابتة للمراجعة.", "all", "report_snapshot", "snapshot-sent", "/reports/snapshots/snapshot-sent"],
  ["owner-shift", "user-owner", "employee-owner", "shift", "urgent", "فرق وردية يحتاج مراجعة", "وردية الفرع الرئيسي بها عجز موثق.", "main", "shift", "shift-review", "/shifts/shift-review"],
  ["owner-expense", "user-owner", "employee-owner", "expense", "high", "طلب مصروف جديد", "طلب إداري ينتظر قرارًا.", "main", "expense", "expense-pending", "/expenses"],
  ["manager-fault", "user-manager", "employee-manager", "maintenance", "high", "بلاغ عطل يحتاج تعيينًا", "بلاغ عاجل في الفرع الرئيسي بلا فني مسؤول.", "main", "fault_report", "fault-1", "/maintenance/faults/fault-1"],
  ["manager-transfer", "user-manager", "employee-manager", "transfer", "high", "فرق استلام في تحويل", "التحويل يحتاج قرارًا إداريًا.", "branch-2", "transfer", "transfer-6", "/inventory/transfers/transfer-6"],
  ["manager-payroll", "user-manager", "employee-manager", "payroll", "normal", "دورة راتب تحتاج مراجعة", "الدورة الشهرية جاهزة للمراجعة.", "all", "payroll_run", "payroll-draft", "/payroll/payroll-draft"],
  ["rental-five", "user-rental", "employee-rental", "rental", "urgent", "متبقي 5 دقائق", "التأجير RNT-2026-0102 يقترب من الانتهاء.", "main", "rental", "rental-near-end", "/rentals/rental-near-end"],
  ["rental-overtime", "user-rental", "employee-rental", "rental", "high", "دخل وقتًا إضافيًا", "يستمر الحساب بالسعر العادي.", "branch-2", "rental", "rental-overtime", "/rentals/rental-overtime"],
  ["sales-return", "user-sales", "employee-sales", "sales", "high", "مرتجع يحتاج موافقة", "طلب المرتجع RET-2026-0502 ينتظر المراجعة.", "main", "sale_return", "return-502", "/sales/returns"],
  ["sales-stock", "user-sales", "employee-sales", "inventory", "normal", "مخزون منخفض", "بطارية ألعاب كهربائية وصلت إلى الحد الأدنى.", "branch-2", "stock_balance", "part-battery-12v", "/inventory?lowStock=true"],
  ["sales-shift", "user-sales", "employee-sales", "shift", "normal", "وردية تحتاج إغلاقًا", "راجعي التحصيلات قبل الإغلاق.", "branch-2", "shift", "shift-sales-open", "/shifts/shift-sales-open"],
  ["tech-assigned", "user-technician", "employee-technician", "maintenance", "urgent", "بلاغ مسند إليك", "FLT-2026-0002 · لعبة عميل لا تعمل بعد الشحن.", "workshop", "fault_report", "fault-2", "/maintenance/faults/fault-2"],
  ["tech-part", "user-technician", "employee-technician", "inventory", "high", "قطعة غير متوفرة", "أمر الصيانة يحتاج بطارية غير متاحة حاليًا.", "workshop", "maintenance_order", "maintenance-order-4", "/maintenance/orders/maintenance-order-4"],
  ["tech-ready", "user-technician", "employee-technician", "maintenance", "normal", "جاهز للتسليم", "اكتمل إصلاح الأمر MNT-2026-0007.", "workshop", "maintenance_order", "maintenance-order-7", "/maintenance/orders/maintenance-order-7"],
  ["dual-rental", "user-dual", "employee-dual", "rental", "normal", "تذكير WhatsApp جاهز", "رسالة التذكير جاهزة للفتح اليدوي.", "branch-3", "rental", "rental-near-end", "/rentals/rental-near-end"],
  ["dual-sales", "user-dual", "employee-dual", "sales", "normal", "عملية بيع تحتاج مراجعة", "فاتورة متعددة البنود تحتاج مراجعة أخيرة.", "branch-2", "sale_invoice", "sale-402", "/sales/invoices/sale-402"],
];

export const NOTIFICATION_FIXTURES: readonly AppNotification[] = seeds.map((seed, index) => ({
  id: `notification-${seed[0]}`,
  notificationNumber: `NTF-2026-${String(index + 1).padStart(4, "0")}`,
  recipientUserId: seed[1], recipientEmployeeId: seed[2], category: seed[3], priority: seed[4], title: seed[5], body: seed[6], branchId: seed[7], referenceType: seed[8], referenceId: seed[9], deepLink: seed[10],
  type: seed[0], status: index % 5 === 0 ? "read" as const : "unread" as const, readAt: index % 5 === 0 ? "2026-08-08T07:30:00.000Z" : null, actedAt: null,
  createdAt: `2026-08-08T${String(8 + (index % 8)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}:00.000Z`, expiresAt: null,
  idempotencyKey: seed[0] === "rental-five" ? "rental:rental-near-end:five-minute-reminder" : seed[0] === "tech-assigned" ? "fault:fault-2:assigned:employee-technician" : `fixture:${seed[0]}`,
  metadata: { fixture: true },
})).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
