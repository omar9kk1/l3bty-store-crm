"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { REPORT_DEFINITIONS } from "../fixtures";
import { canSendReports, isReportsAdmin, reportActorId } from "../permissions";
import { buildReportPayload } from "../services/report-engine";
import { createReportSnapshot, sendSnapshot } from "../services/report-store";
import type { ReportPeriodType, ReportQuery } from "../types";
import { ReportPayloadView } from "./report-ui";

export function ReportViewer({ reportKey }: { reportKey: string }) {
  const { roles, activeBranch } = useShell();
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [sendId, setSendId] = useState<string | null>(null);
  const definition = REPORT_DEFINITIONS.find((item) => item.key === reportKey);
  const offline = params.get("state") === "offline";
  const period = (params.get("period") ?? "daily") as ReportPeriodType;
  const from = params.get("from") ?? "2026-08-06";
  const to = params.get("to") ?? "2026-08-06";
  const branch = params.get("branch") ?? activeBranch.id;
  const comparisonEnabled = params.get("compare") === "true";
  const query: ReportQuery = {
    reportKey,
    periodType: period,
    dateFrom: from,
    dateTo: to,
    branchIds: [branch],
    employeeIds: params.get("employee") ? [params.get("employee")!] : [],
    activityTypes: params.get("type") ? [params.get("type")!] : [],
    statuses: params.get("status") ? [params.get("status")!] : [],
    comparisonEnabled,
    createdByEmployeeId: reportActorId(roles),
    generatedAt: "2026-08-06T22:00:00+03:00",
  };
  const preview = buildReportPayload(query);

  if (!isReportsAdmin(roles) || !definition) return <PermissionDeniedState />;

  const save = () => {
    const result = createReportSnapshot(query, `snapshot-${reportActorId(roles)}-${reportKey}-${period}-${from}-${to}-${branch}`);
    setMessage(result.message);
    if (result.valid && "snapshot" in result) setSendId(result.snapshot.id);
  };
  const send = () => {
    if (!sendId) return;
    const result = sendSnapshot({ snapshotId: sendId, senderEmployeeId: "employee-manager", recipientOwnerEmployeeId: "employee-owner", note: "تقرير إداري للمراجعة", idempotencyKey: `send-${sendId}-owner` });
    setMessage(result.message);
    if (result.valid) setSendId(null);
  };

  return <div className="reports-page">
    <header className="reports-header"><div><span>التقارير</span><h2>{definition.nameAr}</h2><p>{definition.descriptionAr}</p></div><div><Button onClick={() => window.print()}>طباعة</Button><Button disabled={offline || !preview.valid} variant="primary" onClick={save}>حفظ نسخة التقرير</Button></div></header>
    {message ? <p className="reports-feedback" role="status">{message}</p> : null}
    <Card className="report-filters-card"><form className="report-filters"><label>الفترة<select name="period" defaultValue={period}><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option><option value="custom">مخصصة</option></select></label><label>من<input name="from" type="date" defaultValue={from} /></label><label>إلى<input name="to" type="date" defaultValue={to} /></label><label>الفرع<select name="branch" defaultValue={branch}><option value="all">كل الفروع</option><option value="main">الرئيسي</option><option value="branch-2">فرع 2</option><option value="branch-3">فرع 3</option><option value="workshop">الورشة المركزية</option></select></label><div className="report-filter-actions"><label className="report-check"><input name="compare" type="checkbox" value="true" defaultChecked={comparisonEnabled} />مقارنة</label><Button type="submit">تطبيق</Button></div></form></Card>
    {preview.valid ? <ReportPayloadView payload={preview.payload} /> : <Card className="report-state">{preview.message}</Card>}
    <Drawer open={Boolean(sendId) && canSendReports(roles)} onOpenChange={(open) => { if (!open) setSendId(null); }} title="إرسال إلى مالك النشاط" description="سيُرسل Snapshot المحفوظ نفسه دون إعادة حساب." variant="auxiliary"><div className="report-send-form"><p>المستلم: مالك النشاط</p><label>ملاحظة إدارية<textarea defaultValue="تقرير إداري للمراجعة" /></label><Button disabled={offline} variant="primary" onClick={send}>تأكيد الإرسال</Button></div></Drawer>
  </div>;
}

