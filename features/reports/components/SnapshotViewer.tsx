"use client";

import { useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useReports } from "../hooks/use-reports";
import { canSendReports, isReportsAdmin, reportActorId } from "../permissions";
import { recordReportExport, sendSnapshot } from "../services/report-store";
import { ReportPayloadView } from "./report-ui";

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function SnapshotViewer({ snapshotId }: { snapshotId: string }) {
  const { roles } = useShell();
  const data = useReports();
  const [sendOpen, setSendOpen] = useState(false);
  const [message, setMessage] = useState("");
  const snapshot = data.snapshots.find((item) => item.id === snapshotId);

  if (!isReportsAdmin(roles) || !snapshot) return <PermissionDeniedState />;

  const exportJson = () => {
    recordReportExport(snapshotId, reportActorId(roles), "json");
    download(`${snapshot.snapshotNumber}.json`, "application/json", JSON.stringify(snapshot, null, 2));
  };
  const exportCsv = () => {
    const rows = snapshot.payload.sections.flatMap((section) => section.rows);
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? "")).join(","))].join("\n");
    recordReportExport(snapshotId, reportActorId(roles), "csv");
    download(`${snapshot.snapshotNumber}.csv`, "text/csv;charset=utf-8", csv);
  };
  const send = () => {
    const result = sendSnapshot({
      snapshotId,
      senderEmployeeId: "employee-manager",
      recipientOwnerEmployeeId: "employee-owner",
      note: "إرسال نسخة ثابتة من التقرير إلى المالك",
      idempotencyKey: `send-${snapshotId}-owner`,
    });
    setMessage(result.message);
    if (result.valid) setSendOpen(false);
  };

  return <div className="reports-page report-print-view">
    <header className="reports-header"><div><span>نسخة محفوظة · الإصدار {snapshot.version}</span><h2>{snapshot.title}</h2><p>{snapshot.snapshotNumber} · {snapshot.dateFrom} — {snapshot.dateTo}</p></div><Badge tone={snapshot.status === "sent" ? "success" : "info"}>{snapshot.status === "sent" ? "تم الإرسال" : "جاهز"}</Badge></header>
    {message ? <p className="reports-feedback">{message}</p> : null}
    <Card className="snapshot-meta"><dl><div><dt>بصمة المحتوى</dt><dd>{snapshot.contentHash}</dd></div><div><dt>نطاق الفروع</dt><dd>{snapshot.branchIds.length === 1 ? "فرع واحد" : `${snapshot.branchIds.length} فروع`}</dd></div><div><dt>منشئ التقرير</dt><dd>الإدارة</dd></div><div><dt>وقت الإنشاء</dt><dd>{snapshot.createdAt}</dd></div><div><dt>نسخة ثابتة</dt><dd>{snapshot.immutable ? "نعم" : "لا"}</dd></div></dl></Card>
    <div className="report-export-actions"><Button onClick={() => { recordReportExport(snapshotId, reportActorId(roles), "print"); window.print(); }}>طباعة A4</Button><Button onClick={exportJson}>تنزيل JSON</Button><Button onClick={exportCsv}>تنزيل CSV</Button>{canSendReports(roles) && snapshot.status === "ready" ? <Button variant="primary" onClick={() => setSendOpen(true)}>إرسال إلى مالك النشاط</Button> : null}</div>
    <ReportPayloadView payload={snapshot.payload} />
    <Drawer open={sendOpen} onOpenChange={setSendOpen} title="إرسال إلى مالك النشاط" description="المحتوى ثابت ولن يعاد حسابه." variant="auxiliary"><div className="report-send-form"><p>{snapshot.snapshotNumber} · {snapshot.title}</p><label>ملاحظة<textarea defaultValue="يرجى مراجعة التقرير المرفق" /></label><Button variant="primary" onClick={send}>إرسال داخل النظام</Button></div></Drawer>
  </div>;
}
