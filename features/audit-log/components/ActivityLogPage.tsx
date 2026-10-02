"use client";

import { FileClock, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { EMPLOYEE_FIXTURES } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import type { RoleId } from "@/permissions/types";
import { useAudit } from "../hooks/use-audit";
import { canViewAdministrativeAudit } from "../permissions";
import type { AuditCategory, AuditEvent, AuditSeverity } from "../types";
import { ActivityDetailsDrawer } from "./ActivityDetailsDrawer";
import {
  auditActionLabel,
  auditCategoryLabels,
  auditEntityLabel,
  auditRolesLabel,
  AuditSeverityBadge,
  formatAuditTime,
} from "./audit-ui";

function updateFilter(name: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  if (value === "all") params.delete(name);
  else params.set(name, value);
  window.history.pushState(null, "", `${window.location.pathname}?${params}`);
}

export function ActivityLogPage() {
  const { roles } = useShell();
  const { events } = useAudit();
  const branches = useBranches();
  const employees = useEmployees();
  const params = useSearchParams();
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const branchNames = useMemo(
    () => new Map(branches.map((item) => [item.id, item.name])),
    [branches],
  );
  const employeeNames = useMemo(
    () => new Map([...EMPLOYEE_FIXTURES, ...employees].map((item) => [item.id, item.name])),
    [employees],
  );

  if (!canViewAdministrativeAudit(roles)) return <PermissionDeniedState />;

  const branch = params.get("branch") ?? "all";
  const employee = params.get("employee") ?? "all";
  const role = params.get("role") ?? "all";
  const category = (params.get("category") ?? "all") as AuditCategory | "all";
  const action = params.get("action") ?? "all";
  const entity = params.get("entity") ?? "all";
  const severity = (params.get("severity") ?? "all") as AuditSeverity | "all";
  const reference = params.get("reference") ?? "";
  const period = params.get("period") ?? "all";
  const roleOptions = Object.keys(ROLE_TEMPLATES) as RoleId[];

  const filtered = events.filter((event) =>
    (branch === "all" || event.branchId === branch)
    && (employee === "all" || event.actorEmployeeId === employee)
    && (role === "all" || event.actorRolesSnapshot.includes(role as RoleId))
    && (category === "all" || event.category === category)
    && (action === "all" || event.action === action)
    && (entity === "all" || event.entityType === entity)
    && (severity === "all" || event.severity === severity)
    && (!reference || event.referenceNumber.toLowerCase().includes(reference.toLowerCase()))
    && (period === "all" || event.createdAt.startsWith("2026-08-08"))
  );

  return (
    <div className="activity-log-page">
      <header className="activity-log-header">
        <div><span>الإدارة</span><h2>سجل النشاط</h2><p>سجل مركزي للإضافة فقط؛ لا توجد إجراءات تعديل أو حذف.</p></div>
      </header>

      <section className="activity-summary">
        <Card><span>إجمالي الأحداث</span><strong>{events.length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
        <Card><span>أحداث حساسة</span><strong>{events.filter((event) => event.severity === "critical").length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
        <Card><span>أحداث مالية</span><strong>{events.filter((event) => ["finance", "shift", "expense", "payroll"].includes(event.category)).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
        <Card><span>تغييرات صلاحيات</span><strong>{events.filter((event) => event.category === "employees").length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
        <Card><span>أحداث اليوم</span><strong>{events.filter((event) => event.createdAt.startsWith("2026-08-08")).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
        <Card><span>مستخدمون نشطون</span><strong>{new Set(events.map((event) => event.actorEmployeeId)).size.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
      </section>

      <Card className="activity-filters">
        <span><SlidersHorizontal aria-hidden size={18} />الفلاتر</span>
        <label>الفترة<select value={period} onChange={(event) => updateFilter("period", event.target.value)}><option value="all">كل الفترات</option><option value="today">اليوم</option></select></label>
        <label>الفرع<select value={branch} onChange={(event) => updateFilter("branch", event.target.value)}><option value="all">كل الفروع</option>{[...new Set(events.map((event) => event.branchId))].map((value) => <option key={value} value={value}>{branchNames.get(value) ?? "فرع غير معروف"}</option>)}</select></label>
        <label>الموظف<select value={employee} onChange={(event) => updateFilter("employee", event.target.value)}><option value="all">كل الموظفين</option>{[...new Set(events.map((event) => event.actorEmployeeId))].map((value) => <option key={value} value={value}>{employeeNames.get(value) ?? "موظف غير معروف"}</option>)}</select></label>
        <label>الدور<select value={role} onChange={(event) => updateFilter("role", event.target.value)}><option value="all">كل الأدوار</option>{roleOptions.map((value) => <option key={value} value={value}>{ROLE_TEMPLATES[value].shortLabelAr}</option>)}</select></label>
        <label>القسم<select value={category} onChange={(event) => updateFilter("category", event.target.value)}><option value="all">كل الأقسام</option>{Object.entries(auditCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>الإجراء<select value={action} onChange={(event) => updateFilter("action", event.target.value)}><option value="all">كل الإجراءات</option>{[...new Set(events.map((event) => event.action))].map((value) => <option key={value} value={value}>{auditActionLabel(value)}</option>)}</select></label>
        <label>نوع السجل<select value={entity} onChange={(event) => updateFilter("entity", event.target.value)}><option value="all">كل الأنواع</option>{[...new Set(events.map((event) => event.entityType))].map((value) => <option key={value} value={value}>{auditEntityLabel(value)}</option>)}</select></label>
        <label>الأهمية<select value={severity} onChange={(event) => updateFilter("severity", event.target.value)}><option value="all">كل المستويات</option><option value="critical">حساس</option><option value="important">مهم</option><option value="notice">ملحوظ</option><option value="info">معلومة</option></select></label>
        <label>رقم المرجع<input value={reference} onChange={(event) => updateFilter("reference", event.target.value)} placeholder="اكتب رقم المرجع" /></label>
      </Card>

      {filtered.length ? (
        <Card className="activity-list">
          <div className="activity-table-wrap">
            <table>
              <thead><tr><th>الوقت</th><th>المستخدم</th><th>الدور</th><th>الفرع</th><th>الإجراء</th><th>القسم</th><th>المرجع</th><th>الأهمية</th><th>التفاصيل</th></tr></thead>
              <tbody>{filtered.map((event) => (
                <tr key={event.id}>
                  <td>{formatAuditTime(event.createdAt)}</td>
                  <td>{employeeNames.get(event.actorEmployeeId) ?? "موظف غير معروف"}</td>
                  <td>{auditRolesLabel(event.actorRolesSnapshot)}</td>
                  <td>{branchNames.get(event.branchId) ?? "فرع غير معروف"}</td>
                  <td>{auditActionLabel(event.action)}</td>
                  <td>{auditCategoryLabels[event.category]}</td>
                  <td>{event.referenceNumber}</td>
                  <td><AuditSeverityBadge severity={event.severity} /></td>
                  <td><button onClick={() => setSelected(event)}>عرض</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="activity-mobile-list">{filtered.map((event) => (
            <article className="activity-mobile-card" key={event.id}>
              <header><strong>{auditActionLabel(event.action)}</strong><AuditSeverityBadge severity={event.severity} /></header>
              <p>{event.reason}</p>
              <dl>
                <div><dt>المستخدم</dt><dd>{employeeNames.get(event.actorEmployeeId) ?? "موظف غير معروف"}</dd></div>
                <div><dt>الفرع</dt><dd>{branchNames.get(event.branchId) ?? "فرع غير معروف"}</dd></div>
                <div><dt>القسم</dt><dd>{auditCategoryLabels[event.category]}</dd></div>
                <div><dt>المرجع</dt><dd>{event.referenceNumber}</dd></div>
                <div><dt>الوقت</dt><dd>{formatAuditTime(event.createdAt)}</dd></div>
              </dl>
              <button onClick={() => setSelected(event)}>عرض التفاصيل</button>
            </article>
          ))}</div>
        </Card>
      ) : (
        <Card className="activity-empty"><FileClock aria-hidden /><h3>لا توجد أحداث مطابقة</h3><p>غيّر الفلاتر لعرض نطاق أوسع.</p></Card>
      )}
      <ActivityDetailsDrawer event={selected} onOpenChange={(open) => { if (!open) setSelected(null); }} />
    </div>
  );
}
