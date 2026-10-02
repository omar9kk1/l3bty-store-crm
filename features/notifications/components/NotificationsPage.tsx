"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck, SlidersHorizontal } from "lucide-react";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useNotifications } from "../hooks/use-notifications";
import { canOpenNotificationReference, canReceiveNotification, resolveNotificationIdentity } from "../permissions";
import { dismissNotification, markAllNotificationsRead, markNotificationRead, markNotificationUnread } from "../services/notification-service";
import type { AppNotification, NotificationCategory, NotificationPriority, NotificationStatus } from "../types";
import { categoryLabels, notificationBranchLabel, NotificationPriorityBadge, PriorityIcon, relativeNotificationTime } from "./notification-ui";

function updateFilter(name: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  if (value === "all") params.delete(name); else params.set(name, value);
  params.delete("userId"); window.history.pushState(null, "", `${window.location.pathname}?${params}`);
}

export function NotificationsPage() {
  const { roles } = useShell();
  const branches = useBranches();
  const { notifications } = useNotifications();
  const params = useSearchParams();
  const identity = resolveNotificationIdentity(roles);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [notice, setNotice] = useState("");
  const offline = params.get("state") === "offline";
  const mine = notifications.filter((item) => canReceiveNotification(item, roles) && item.status !== "dismissed" && item.status !== "expired");
  const status = (params.get("status") ?? "all") as NotificationStatus | "all";
  const category = (params.get("category") ?? "all") as NotificationCategory | "all";
  const priority = (params.get("priority") ?? "all") as NotificationPriority | "all";
  const branch = params.get("branch") ?? "all";
  const period = params.get("period") ?? "all";
  const filtered = mine.filter((item) => (status === "all" || item.status === status) && (category === "all" || item.category === category) && (priority === "all" || item.priority === priority) && (branch === "all" || item.branchId === branch) && (period === "all" || period === "today" && item.createdAt.startsWith("2026-08-08") || period === "older" && !item.createdAt.startsWith("2026-08-08")));
  const unread = mine.filter((item) => item.status === "unread").length;
  const high = mine.filter((item) => item.priority === "high" || item.priority === "urgent").length;
  const visibleBranchIds = [...new Set(mine.map((item) => item.branchId))].filter((value) => value !== "all");
  const getBranchLabel = (branchId: string) => notificationBranchLabel(branchId, branches);

  const openReference = (item: AppNotification) => {
    markNotificationRead(item.id, identity.userId);
    if (!canOpenNotificationReference(item, roles)) setNotice("تغيّرت صلاحيتك الحالية؛ لا يمنح الإشعار حق فتح المرجع.");
  };

  return <div className="notifications-page">
    <header className="notifications-header"><div><span>مساحة المستخدم</span><h2>مركز الإشعارات</h2><p>إشعارات {identity.employee.name} فقط، مرتبة من الأحدث إلى الأقدم.</p></div><Button disabled={offline || unread === 0} onClick={() => markAllNotificationsRead(identity.userId)}><CheckCheck aria-hidden size={18} />تعليم الكل كمقروء</Button></header>
    {offline ? <p className="notifications-offline">وضع دون اتصال: آخر بيانات محفوظة متاحة للقراءة، ولا توجد مزامنة خلفية حاليًا.</p> : null}
    {notice ? <p className="notifications-notice" role="status">{notice}</p> : null}
    <section className="notifications-summary" aria-label="ملخص الإشعارات"><Card><span>غير مقروءة</span><strong>{unread.toLocaleString("ar-EG-u-nu-latn")}</strong></Card><Card><span>عالية الأولوية</span><strong>{high.toLocaleString("ar-EG-u-nu-latn")}</strong></Card><Card><span>إجمالي الظاهر</span><strong>{mine.length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card><Card><span>اليوم</span><strong>{mine.filter((item) => item.createdAt.startsWith("2026-08-08")).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card></section>
    <Card className="notifications-filters"><span className="notifications-filters__title"><SlidersHorizontal aria-hidden size={18} />الفلاتر</span><label>الحالة<select value={status} onChange={(event) => updateFilter("status", event.target.value)}><option value="all">كل الحالات</option><option value="unread">غير مقروء</option><option value="read">مقروء</option><option value="acted">تم الإجراء</option></select></label><label>النوع<select value={category} onChange={(event) => updateFilter("category", event.target.value)}><option value="all">كل الأنواع</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>الأولوية<select value={priority} onChange={(event) => updateFilter("priority", event.target.value)}><option value="all">كل الأولويات</option><option value="urgent">عاجلة</option><option value="high">مرتفعة</option><option value="normal">عادية</option><option value="low">منخفضة</option></select></label><label>الفرع<select value={branch} onChange={(event) => updateFilter("branch", event.target.value)}><option value="all">كل الفروع المسندة</option>{visibleBranchIds.map((value) => <option key={value} value={value}>{getBranchLabel(value)}</option>)}</select></label><label>الفترة<select value={period} onChange={(event) => updateFilter("period", event.target.value)}><option value="all">كل الفترات</option><option value="today">اليوم</option><option value="older">الأقدم</option></select></label></Card>
    {filtered.length ? <section className="notification-list" aria-label="قائمة الإشعارات">{filtered.map((item) => <article key={item.id} className="notification-card" data-unread={item.status === "unread" || undefined}><div className="notification-card__icon"><PriorityIcon priority={item.priority} /></div><div className="notification-card__content"><header><div><span>{categoryLabels[item.category]}</span><h3>{item.title}</h3></div><NotificationPriorityBadge priority={item.priority} /></header><p>{item.body}</p><footer><div className="notification-card__meta"><time title={new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(item.createdAt))}>{relativeNotificationTime(item.createdAt)}</time><span>{getBranchLabel(item.branchId)}</span></div><div className="notification-card__actions"><button onClick={() => setSelected(item)}>التفاصيل</button>{canOpenNotificationReference(item, roles) ? <Link href={item.deepLink} onClick={() => openReference(item)}>فتح المرجع</Link> : <button onClick={() => openReference(item)}>التحقق من المرجع</button>}</div></footer></div></article>)}</section> : <Card className="notification-empty"><Bell aria-hidden /><h3>لا توجد إشعارات مطابقة</h3><p>غيّر الفلاتر أو راجع الإشعارات المقروءة.</p></Card>}
    <Drawer open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} title={selected?.title ?? "تفاصيل الإشعار"} description={selected?.notificationNumber} variant="auxiliary">{selected ? <div className="notification-details"><NotificationPriorityBadge priority={selected.priority} /><p>{selected.body}</p><dl><div><dt>الفئة</dt><dd>{categoryLabels[selected.category]}</dd></div><div><dt>النطاق</dt><dd>{getBranchLabel(selected.branchId)}</dd></div><div><dt>رقم المرجع</dt><dd>{selected.referenceId}</dd></div><div><dt>الوقت</dt><dd>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(selected.createdAt))}</dd></div></dl><div className="notification-details__actions"><Button disabled={offline} onClick={() => selected.status === "unread" ? markNotificationRead(selected.id, identity.userId) : markNotificationUnread(selected.id, identity.userId)}>{selected.status === "unread" ? "تعليم كمقروء" : "تعليم كغير مقروء"}</Button><Button disabled={offline} onClick={() => { dismissNotification(selected.id, identity.userId); setSelected(null); }}>إخفاء من قائمتي</Button></div></div> : null}</Drawer>
  </div>;
}
