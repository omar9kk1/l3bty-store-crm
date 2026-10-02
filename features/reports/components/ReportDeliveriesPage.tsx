"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useReports } from "../hooks/use-reports";
import { isReportsAdmin } from "../permissions";
import { openDelivery, retryDelivery } from "../services/report-store";
import type { DeliveryStatus } from "../types";

const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  pending: "قيد التجهيز",
  sent: "تم الإرسال",
  opened: "تم الفتح",
  failed: "فشل الإرسال",
  cancelled: "ملغي",
};

export function ReportDeliveriesPage() {
  const { roles } = useShell();
  const offline = useSearchParams().get("state") === "offline";
  const data = useReports();
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (!isReportsAdmin(roles)) return <PermissionDeniedState />;

  const owner = roles.includes("owner");
  const manager = roles.includes("manager") && !owner;
  const deliveries = data.deliveries.filter((item) =>
    owner
      ? item.recipientOwnerEmployeeId === "employee-owner"
      : item.senderEmployeeId === "employee-manager",
  );
  const item = data.deliveries.find((delivery) => delivery.id === selected);
  const snapshot = item ? data.snapshots.find((entry) => entry.id === item.snapshotId) : null;

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <span>التقارير</span>
          <h2>{owner ? "صندوق تقارير المالك" : "سجل التقارير المرسلة"}</h2>
          <p>تابع حالة إرسال التقارير وفتحها، وأعد المحاولة عند فشل الإرسال.</p>
        </div>
      </header>

      {message ? <p className="reports-feedback">{message}</p> : null}

      <section className="delivery-summary">
        <Card><span>لم تُفتح بعد</span><strong>{deliveries.filter((entry) => entry.status === "sent").length}</strong></Card>
        <Card><span>مفتوحة</span><strong>{deliveries.filter((entry) => entry.status === "opened").length}</strong></Card>
        <Card><span>فشل إرسالها</span><strong>{deliveries.filter((entry) => entry.status === "failed").length}</strong></Card>
      </section>

      <section className="delivery-grid">
        {deliveries.map((delivery) => {
          const report = data.snapshots.find((entry) => entry.id === delivery.snapshotId);
          return (
            <button key={delivery.id} onClick={() => setSelected(delivery.id)}>
              <Card>
                <header>
                  <strong>{delivery.deliveryNumber}</strong>
                  <Badge tone={delivery.status === "failed" ? "danger" : delivery.status === "opened" ? "success" : "info"}>
                    {deliveryStatusLabels[delivery.status]}
                  </Badge>
                </header>
                <h3>{report?.title ?? "تقرير غير متاح"}</h3>
                <p>{report?.dateFrom} — {report?.dateTo}</p>
                <small>{delivery.note}</small>
              </Card>
            </button>
          );
        })}
      </section>

      <Drawer
        open={Boolean(item)}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        title={item?.deliveryNumber ?? "تفاصيل التسليم"}
        description="سجل دائم لحالة تسليم التقرير."
        variant="auxiliary"
      >
        {item && snapshot ? (
          <div className="delivery-details">
            <p>{snapshot.title}</p>
            <p>{item.sentAt ?? item.failedAt}</p>
            <p>{item.note}</p>
            <p>عدد المحاولات: {item.retryCount}</p>
            {owner && item.status !== "failed" ? (
              <Link
                className="report-link-button"
                href={`/reports/snapshots/${snapshot.id}`}
                onClick={() => openDelivery(item.id, "employee-owner")}
              >
                فتح التقرير
              </Link>
            ) : null}
            {manager && item.status === "failed" ? (
              <Button
                disabled={offline}
                variant="primary"
                onClick={() => {
                  const result = retryDelivery(item.id, "employee-manager");
                  setMessage(result.message);
                  if (result.valid) setSelected(null);
                }}
              >
                إعادة المحاولة
              </Button>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
