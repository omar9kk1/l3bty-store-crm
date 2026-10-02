import { Badge } from "@/components/ui/Badge";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import type { AuditEvent, AuditSeverity, AuditValue } from "../types";

export const auditCategoryLabels: Record<AuditEvent["category"], string> = {
  employees: "الموظفون والصلاحيات",
  attendance: "الحضور والانصراف",
  rental: "التأجير",
  sales: "المبيعات",
  maintenance: "الصيانة",
  inventory: "المخزون",
  transfer: "التحويلات",
  finance: "المالية",
  shift: "الورديات",
  expense: "المصروفات",
  payroll: "الرواتب",
  report: "التقارير",
  customer: "العملاء",
  system: "النظام",
};

export const auditSeverityLabels: Record<AuditSeverity, string> = {
  info: "معلومة",
  notice: "ملحوظ",
  important: "مهم",
  critical: "حساس",
};

const actionLabels: Record<string, string> = {
  employee_created: "إضافة موظف",
  role_changed: "تغيير دور موظف",
  attendance_captured: "تسجيل حضور أو انصراف",
  attendance_exception_approved: "اعتماد استثناء حضور",
  rental_started: "بدء تأجير",
  rental_extended: "تمديد تأجير",
  whatsapp_reminder_opened: "فتح تذكير واتساب",
  sale_completed: "إتمام بيع",
  return_approved: "اعتماد مرتجع",
  fault_reported: "تسجيل بلاغ عطل",
  technician_assigned: "تعيين فني صيانة",
  maintenance_diagnosed: "تسجيل تشخيص الصيانة",
  part_issued: "صرف قطعة غيار",
  stock_adjusted: "تسوية المخزون",
  transfer_requested: "طلب تحويل",
  transfer_difference_reviewed: "مراجعة فرق تحويل",
  payment_reversed: "عكس حركة مالية",
  shift_opened: "فتح وردية",
  expense_approved: "تسجيل مصروف",
  payroll_approved: "اعتماد كشف راتب",
  report_snapshot_sent: "إرسال نسخة تقرير",
  report_snapshot_opened: "فتح نسخة تقرير",
};

const entityLabels: Record<string, string> = {
  employee: "موظف",
  branch: "فرع",
  rental: "تأجير",
  sale: "فاتورة بيع",
  product: "منتج",
  maintenance_order: "أمر صيانة",
  fault_report: "بلاغ عطل",
  inventory: "مخزون",
  inventory_movement: "حركة مخزون",
  shift: "وردية",
  payroll: "كشف راتب",
  expense: "مصروف",
  customer: "عميل",
  transfer: "طلب تحويل",
  report: "تقرير",
  attendance: "حضور وانصراف",
};

const fieldLabels: Record<string, string> = {
  status: "الحالة",
  branchId: "الفرع",
  employeeId: "الموظف",
  role: "الدور",
  roles: "الأدوار",
  amount: "المبلغ",
  quantity: "الكمية",
  price: "السعر",
  paymentStatus: "حالة الدفع",
  assignedTechnicianId: "الفني المسؤول",
};

export const auditActionLabel = (action: string) => actionLabels[action] ?? "إجراء مسجل";
export const auditEntityLabel = (entityType: string) => entityLabels[entityType] ?? "سجل";
export const auditFieldLabel = (field: string) => fieldLabels[field] ?? "بيان مُحدّث";
export const auditRolesLabel = (roles: AuditEvent["actorRolesSnapshot"]) =>
  roles.map((role) => ROLE_TEMPLATES[role]?.shortLabelAr ?? "دور وظيفي").join("، ");
export const auditSeverityTone = (severity: AuditSeverity) =>
  severity === "critical" ? "danger" as const
    : severity === "important" ? "warning" as const
      : severity === "notice" ? "info" as const
        : "neutral" as const;

export function AuditSeverityBadge({ severity }: { severity: AuditSeverity }) {
  return <Badge tone={auditSeverityTone(severity)}>{auditSeverityLabels[severity]}</Badge>;
}

export function formatAuditTime(value: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "object") return "بيانات محدثة";
  return String(value);
}

export function AuditValueDiff({ before, after }: { before: AuditValue; after: AuditValue }) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (!keys.length) return <p className="audit-no-diff">لا توجد قيم سابقة أو لاحقة لهذا الحدث.</p>;
  return (
    <div className="audit-diff">
      {keys.map((key) => (
        <div key={key}>
          <strong>{auditFieldLabel(key)}</strong>
          <span data-kind="before">قبل: {formatAuditValue(before?.[key])}</span>
          <span data-kind="after">بعد: {formatAuditValue(after?.[key])}</span>
        </div>
      ))}
    </div>
  );
}
