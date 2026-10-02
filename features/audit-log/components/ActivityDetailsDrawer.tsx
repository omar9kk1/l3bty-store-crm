import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { EMPLOYEE_FIXTURES } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import type { AuditEvent } from "../types";
import {
  auditActionLabel,
  auditCategoryLabels,
  auditEntityLabel,
  auditRolesLabel,
  AuditSeverityBadge,
  AuditValueDiff,
  formatAuditTime,
} from "./audit-ui";

const sourceLabels: Record<string, string> = {
  web: "المتصفح",
  mobile_web: "الهاتف",
  system_mock: "النظام",
};

export function ActivityDetailsDrawer({ event, onOpenChange, personal = false }: {
  event: AuditEvent | null;
  onOpenChange: (open: boolean) => void;
  personal?: boolean;
}) {
  const branches = useBranches();
  const employees = useEmployees();
  const employeeName = event
    ? employees.find((item) => item.id === event.actorEmployeeId)?.name
      ?? EMPLOYEE_FIXTURES.find((item) => item.id === event.actorEmployeeId)?.name
      ?? "موظف غير معروف"
    : "";
  const branchName = event
    ? branches.find((item) => item.id === event.branchId)?.name ?? "فرع غير معروف"
    : "";

  return (
    <Drawer
      open={Boolean(event)}
      onOpenChange={onOpenChange}
      title={event ? auditActionLabel(event.action) : "تفاصيل النشاط"}
      description={event?.eventNumber}
      variant="auxiliary"
    >
      {event ? (
        <div className="activity-details">
          <AuditSeverityBadge severity={event.severity} />
          <dl>
            <div><dt>المستخدم</dt><dd>{employeeName}</dd></div>
            <div><dt>الوقت</dt><dd>{formatAuditTime(event.createdAt)}</dd></div>
            <div><dt>الفرع</dt><dd>{branchName}</dd></div>
            <div><dt>الدور وقت العملية</dt><dd>{auditRolesLabel(event.actorRolesSnapshot)}</dd></div>
            <div><dt>القسم</dt><dd>{auditCategoryLabels[event.category]}</dd></div>
            <div><dt>نوع السجل</dt><dd>{auditEntityLabel(event.entityType)} · {event.referenceNumber}</dd></div>
            <div><dt>السبب</dt><dd>{event.reason}</dd></div>
          </dl>
          {personal && ["critical", "important"].includes(event.severity) ? (
            <p className="activity-sensitive-note">تم حجب تفاصيل التغيير الحساسة من العرض الشخصي.</p>
          ) : (
            <>
              <h3>التغييرات</h3>
              <AuditValueDiff before={event.before} after={event.after} />
            </>
          )}
          {!personal ? (
            <details>
              <summary>معلومات العملية</summary>
              <dl>
                <div><dt>رقم الطلب</dt><dd>{event.requestId}</dd></div>
                <div><dt>المصدر</dt><dd>{sourceLabels[event.source] ?? "النظام"}</dd></div>
                <div><dt>الحقول المتغيرة</dt><dd>{event.changedFields.length || "—"}</dd></div>
              </dl>
            </details>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
