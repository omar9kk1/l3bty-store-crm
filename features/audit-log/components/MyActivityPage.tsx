"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileClock } from "lucide-react";
import { useShell } from "@/components/shell/ShellContext";
import { Card } from "@/components/ui/Card";
import { resolveNotificationIdentity } from "@/features/notifications/permissions";
import { useAudit } from "../hooks/use-audit";
import { canViewPersonalEvent } from "../permissions";
import type { AuditEvent } from "../types";
import { ActivityDetailsDrawer } from "./ActivityDetailsDrawer";
import { auditActionLabel, auditCategoryLabels, AuditSeverityBadge, formatAuditTime } from "./audit-ui";

export function MyActivityPage() {
  const { roles } = useShell(); const { events } = useAudit(); const params = useSearchParams(); const identity = resolveNotificationIdentity(roles); const [selected, setSelected] = useState<AuditEvent | null>(null); const period = params.get("period") ?? "today"; const category = params.get("category") ?? "all";
  const mine = events.filter((event) => canViewPersonalEvent(event, identity.employeeId, roles) && (category === "all" || event.category === category));
  return <div className="my-activity-page"><header className="activity-log-header"><div><span>مساحة المستخدم</span><h2>نشاطي</h2><p>الأحداث التي نفذها {identity.employee.name} فقط، دون بيانات موظفين آخرين.</p></div></header><Card className="my-activity-filters"><label>الفترة<select value={period} onChange={(e) => { const query = new URLSearchParams(window.location.search); query.set("period", e.target.value); window.history.pushState(null, "", `?${query}`); }}><option value="today">اليوم</option><option value="week">الأسبوع</option><option value="month">الشهر</option></select></label><label>الفئة<select value={category} onChange={(e) => { const query = new URLSearchParams(window.location.search); if (e.target.value === "all") query.delete("category"); else query.set("category", e.target.value); window.history.pushState(null, "", `?${query}`); }}><option value="all">كل نشاطي المسموح</option>{[...new Set(mine.map((event) => event.category))].map((value) => <option key={value} value={value}>{auditCategoryLabels[value]}</option>)}</select></label></Card>{mine.length ? <section className="my-activity-timeline">{mine.map((event) => <article key={event.id}><span className="my-activity-timeline__dot" /><div><header><strong>{auditActionLabel(event.action)}</strong><AuditSeverityBadge severity={event.severity} /></header><p>{event.reason}</p><footer><span>{auditCategoryLabels[event.category]}</span><span>{event.referenceNumber}</span><time>{formatAuditTime(event.createdAt)}</time><button onClick={() => setSelected(event)}>التفاصيل</button></footer></div></article>)}</section> : <Card className="activity-empty"><FileClock aria-hidden /><h3>لا يوجد نشاط شخصي مطابق</h3><p>لا تظهر هنا أحداث النظام أو أحداث الموظفين الآخرين.</p></Card>}<ActivityDetailsDrawer event={selected} personal onOpenChange={(open) => { if (!open) setSelected(null); }} /></div>;
}
