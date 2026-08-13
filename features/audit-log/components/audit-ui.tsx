import { Badge } from "@/components/ui/Badge";
import type { AuditEvent, AuditSeverity, AuditValue } from "../types";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";

export const auditCategoryLabels: Record<AuditEvent["category"], string> = { employees: "الموظفون والصلاحيات", attendance: "الحضور", rental: "التأجير", sales: "المبيعات", maintenance: "الصيانة", inventory: "المخزون", transfer: "التحويلات", finance: "المالية", shift: "الورديات", expense: "المصروفات", payroll: "الرواتب", report: "التقارير", customer: "العملاء", system: "النظام" };
export const auditSeverityLabels: Record<AuditSeverity, string> = { info: "معلومة", notice: "ملحوظ", important: "مهم", critical: "حساس" };
const actionLabels: Record<string, string> = { employee_created: "إضافة موظف", role_changed: "تغيير دور", attendance_captured: "تسجيل حضور", attendance_exception_approved: "اعتماد استثناء حضور", rental_started: "بدء تأجير", rental_extended: "تمديد تأجير", whatsapp_reminder_opened: "فتح تذكير واتساب", sale_completed: "إتمام بيع", return_approved: "اعتماد مرتجع", fault_reported: "تسجيل بلاغ عطل", technician_assigned: "إسناد فني", maintenance_diagnosed: "تسجيل تشخيص", part_issued: "صرف قطعة غيار", stock_adjusted: "تسوية مخزون", transfer_requested: "طلب تحويل", transfer_difference_reviewed: "مراجعة فرق تحويل", payment_reversed: "عكس حركة مالية", shift_opened: "فتح وردية", expense_approved: "اعتماد مصروف", payroll_approved: "اعتماد دورة رواتب", report_snapshot_sent: "إرسال نسخة تقرير", report_snapshot_opened: "فتح نسخة تقرير" };
export const auditActionLabel = (action: string) => actionLabels[action] ?? action.replaceAll("_", " ");
export const auditRolesLabel = (roles: AuditEvent["actorRolesSnapshot"]) => roles.map((role) => ROLE_TEMPLATES[role].shortLabelAr).join("، ");
export const auditSeverityTone = (severity: AuditSeverity) => severity === "critical" ? "danger" as const : severity === "important" ? "warning" as const : severity === "notice" ? "info" as const : "neutral" as const;
export function AuditSeverityBadge({ severity }: { severity: AuditSeverity }) { return <Badge tone={auditSeverityTone(severity)}>{auditSeverityLabels[severity]}</Badge>; }
export function formatAuditTime(value: string) { return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value)); }
export function AuditValueDiff({ before, after }: { before: AuditValue; after: AuditValue }) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (!keys.length) return <p className="audit-no-diff">لا توجد قيم قبل/بعد لهذا الحدث.</p>;
  return <div className="audit-diff">{keys.map((key) => <div key={key}><strong>{key}</strong><span data-kind="before">قبل: {String(before?.[key] ?? "—")}</span><span data-kind="after">بعد: {String(after?.[key] ?? "—")}</span></div>)}</div>;
}
