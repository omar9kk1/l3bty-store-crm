import type { RoleId } from "@/permissions/types";
import type { AuditCategory, AuditEvent, AuditSeverity } from "./types";

type Actor = { user: string; employee: string; roles: readonly RoleId[] };
const actors = {
  owner: { user: "user-owner", employee: "employee-owner", roles: ["owner"] },
  manager: { user: "user-manager", employee: "employee-manager", roles: ["manager"] },
  rental: { user: "user-rental", employee: "employee-rental", roles: ["rental_maintenance_employee"] },
  sales: { user: "user-sales", employee: "employee-sales", roles: ["sales_employee"] },
  technician: { user: "user-technician", employee: "employee-technician", roles: ["maintenance_technician"] },
  dual: { user: "user-dual", employee: "employee-dual", roles: ["sales_employee", "rental_maintenance_employee"] },
} satisfies Record<string, Actor>;

type Seed = { actor: Actor; branch: string; action: string; category: AuditCategory; entity: string; id: string; reference: string; severity: AuditSeverity; reason: string; before?: Record<string, unknown>; after?: Record<string, unknown>; fields?: string[]; source?: "web" | "mobile_web" | "system_mock" };
const seeds: readonly Seed[] = [
  { actor: actors.owner, branch: "all", action: "employee_created", category: "employees", entity: "employee", id: "employee-008", reference: "EMP-0008", severity: "important", reason: "إضافة موظف جديد", after: { role: "sales_employee", phone: "01012345678", password: "hidden-value" }, fields: ["role", "phone"] },
  { actor: actors.manager, branch: "main", action: "role_changed", category: "employees", entity: "employee", id: "employee-dual", reference: "EMP-0006", severity: "critical", reason: "تعدد أدوار معتمد", before: { roles: ["sales_employee"], apiToken: "secret" }, after: { roles: ["sales_employee", "rental_maintenance_employee"] }, fields: ["roles"] },
  { actor: actors.sales, branch: "branch-2", action: "attendance_captured", category: "attendance", entity: "attendance_event", id: "attendance-sales", reference: "ATT-2026-0410", severity: "info", reason: "تسجيل حضور من الموقع", after: { status: "accepted" }, source: "mobile_web" },
  { actor: actors.manager, branch: "main", action: "attendance_exception_approved", category: "attendance", entity: "attendance_exception", id: "exception-1", reference: "ATX-2026-0011", severity: "important", reason: "مراجعة سبب خارج النطاق", before: { status: "pending" }, after: { status: "approved" }, fields: ["status"] },
  { actor: actors.rental, branch: "main", action: "rental_started", category: "rental", entity: "rental", id: "rental-active-15", reference: "RNT-2026-0101", severity: "notice", reason: "بدء الحساب بعد اختيار الأصل", after: { status: "active" } },
  { actor: actors.rental, branch: "branch-2", action: "rental_extended", category: "rental", entity: "rental", id: "rental-overtime", reference: "RNT-2026-0103", severity: "important", reason: "دخول وقت إضافي بالسعر العادي", before: { amount: 75 }, after: { amount: 92 }, fields: ["amount"] },
  { actor: actors.rental, branch: "main", action: "whatsapp_reminder_opened", category: "rental", entity: "rental", id: "rental-near-end", reference: "RNT-2026-0102", severity: "info", reason: "فتح رسالة التذكير اليدوية" },
  { actor: actors.sales, branch: "main", action: "sale_completed", category: "sales", entity: "sale_invoice", id: "sale-401", reference: "SAL-2026-0401", severity: "notice", reason: "بيع مكتمل", after: { total: 9380, cardNumber: "4111111111111111" } },
  { actor: actors.manager, branch: "main", action: "return_approved", category: "sales", entity: "sale_return", id: "return-501", reference: "RET-2026-0501", severity: "important", reason: "اعتماد مرتجع جزئي", before: { status: "pending" }, after: { status: "approved" }, fields: ["status"] },
  { actor: actors.rental, branch: "main", action: "fault_reported", category: "maintenance", entity: "fault_report", id: "fault-1", reference: "FLT-2026-0001", severity: "important", reason: "بلاغ توقف تشغيل" },
  { actor: actors.manager, branch: "main", action: "technician_assigned", category: "maintenance", entity: "fault_report", id: "fault-2", reference: "FLT-2026-0002", severity: "important", reason: "إسناد إلى فني مؤهل", before: { technicianId: null }, after: { technicianId: "employee-technician" }, fields: ["technicianId"] },
  { actor: actors.technician, branch: "workshop", action: "maintenance_diagnosed", category: "maintenance", entity: "maintenance_order", id: "maintenance-order-2", reference: "MNT-2026-0002", severity: "notice", reason: "تسجيل التشخيص الفني", after: { status: "diagnosed" } },
  { actor: actors.technician, branch: "workshop", action: "part_issued", category: "inventory", entity: "part_usage", id: "part-usage-2", reference: "MNT-2026-0002", severity: "notice", reason: "صرف قطعة للأمر", before: { quantity: 6 }, after: { quantity: 5 }, fields: ["quantity"] },
  { actor: actors.manager, branch: "main", action: "stock_adjusted", category: "inventory", entity: "stock_balance", id: "part-battery-12v", reference: "INV-ADJ-0012", severity: "critical", reason: "فرق جرد موثق", before: { quantity: 9 }, after: { quantity: 10 }, fields: ["quantity"] },
  { actor: actors.sales, branch: "branch-2", action: "transfer_requested", category: "transfer", entity: "transfer", id: "transfer-1", reference: "TRF-2026-000001", severity: "notice", reason: "احتياج مخزون تشغيلي" },
  { actor: actors.manager, branch: "branch-2", action: "transfer_difference_reviewed", category: "transfer", entity: "transfer", id: "transfer-6", reference: "TRF-2026-000006", severity: "important", reason: "مراجعة فرق الاستلام", before: { received: 1 }, after: { received: 2 }, fields: ["received"] },
  { actor: actors.manager, branch: "main", action: "payment_reversed", category: "finance", entity: "payment", id: "payment-reversal", reference: "PAY-2026-0014", severity: "critical", reason: "عكس بحجة موثقة", before: { status: "completed", amount: 500 }, after: { status: "reversed", amount: 500 }, fields: ["status"] },
  { actor: actors.sales, branch: "branch-2", action: "shift_opened", category: "shift", entity: "shift", id: "shift-sales-open", reference: "SHF-2026-SALES", severity: "notice", reason: "فتح وردية الموظف" },
  { actor: actors.manager, branch: "main", action: "expense_approved", category: "expense", entity: "expense", id: "expense-pending", reference: "EXP-2026-0002", severity: "important", reason: "اعتماد مصروف موثق", before: { status: "pending" }, after: { status: "approved" }, fields: ["status"] },
  { actor: actors.manager, branch: "all", action: "payroll_approved", category: "payroll", entity: "payroll_run", id: "payroll-draft", reference: "PAYROLL-2026-07", severity: "critical", reason: "اعتماد دورة الرواتب", before: { status: "pending_review" }, after: { status: "approved" }, fields: ["status"] },
  { actor: actors.manager, branch: "all", action: "report_snapshot_sent", category: "report", entity: "report_snapshot", id: "snapshot-sent", reference: "RPT-2026-0002", severity: "important", reason: "إرسال نسخة ثابتة للمالك" },
  { actor: actors.owner, branch: "all", action: "report_snapshot_opened", category: "report", entity: "report_snapshot", id: "snapshot-sent", reference: "RPT-2026-0002", severity: "info", reason: "فتح المالك النسخة المرسلة" },
];

export const AUDIT_FIXTURES: readonly AuditEvent[] = seeds.map((seed, index) => ({
  id: `audit-${index + 1}`, eventNumber: `AUD-2026-${String(index + 1).padStart(5, "0")}`, actorUserId: seed.actor.user, actorEmployeeId: seed.actor.employee, actorRolesSnapshot: seed.actor.roles,
  branchId: seed.branch, action: seed.action, category: seed.category, entityType: seed.entity, entityId: seed.id, referenceNumber: seed.reference, severity: seed.severity, reason: seed.reason,
  before: seed.before ?? null, after: seed.after ?? null, changedFields: seed.fields ?? [], source: seed.source ?? "web", requestId: `req-mock-${String(index + 1).padStart(4, "0")}`,
  idempotencyKey: `audit:${seed.category}:${seed.action}:${seed.id}:${index + 1}`, ipAddressMock: "192.0.2.10", userAgentSummaryMock: seed.source === "mobile_web" ? "Mobile Web · Mock" : "Desktop Web · Mock",
  createdAt: `2026-08-08T${String(7 + (index % 9)).padStart(2, "0")}:${String((index * 5) % 60).padStart(2, "0")}:00.000Z`,
})).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
