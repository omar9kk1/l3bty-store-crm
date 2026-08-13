import { AlertTriangle, BellRing, CircleAlert, Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { AppNotification, NotificationPriority } from "../types";

export const priorityLabels: Record<NotificationPriority, string> = { low: "منخفضة", normal: "عادية", high: "مرتفعة", urgent: "عاجلة" };
export const categoryLabels: Record<AppNotification["category"], string> = { rental: "التأجير", sales: "المبيعات", maintenance: "الصيانة", inventory: "المخزون", transfer: "التحويلات", finance: "المالية", shift: "الورديات", expense: "المصروفات", payroll: "الرواتب", attendance: "الحضور", report: "التقارير", customer: "العملاء", system: "النظام" };
export const priorityTone = (priority: NotificationPriority) => priority === "urgent" ? "danger" as const : priority === "high" ? "warning" as const : priority === "normal" ? "info" as const : "neutral" as const;
export function PriorityIcon({ priority }: { priority: NotificationPriority }) { return priority === "urgent" ? <CircleAlert aria-hidden /> : priority === "high" ? <AlertTriangle aria-hidden /> : priority === "normal" ? <BellRing aria-hidden /> : <Info aria-hidden />; }
export function NotificationPriorityBadge({ priority }: { priority: NotificationPriority }) { return <Badge tone={priorityTone(priority)}>{priorityLabels[priority]}</Badge>; }
export function relativeNotificationTime(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.parse("2026-08-08T15:30:00.000Z") - Date.parse(createdAt)) / 60000));
  if (minutes < 2) return "الآن";
  if (minutes < 60) return `منذ ${minutes.toLocaleString("ar-EG-u-nu-latn")} دقائق`;
  const hours = Math.floor(minutes / 60); return hours < 24 ? `منذ ${hours.toLocaleString("ar-EG-u-nu-latn")} ساعة` : `منذ ${Math.floor(hours / 24).toLocaleString("ar-EG-u-nu-latn")} يوم`;
}
