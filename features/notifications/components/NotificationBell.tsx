"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { useShell } from "@/components/shell/ShellContext";
import { useNotifications } from "../hooks/use-notifications";
import { canReceiveNotification, resolveNotificationIdentity } from "../permissions";
import { markNotificationRead } from "../services/notification-service";
import { NotificationPriorityBadge, relativeNotificationTime } from "./notification-ui";

export function NotificationBell() {
  const { roles } = useShell(); const { notifications } = useNotifications(); const identity = resolveNotificationIdentity(roles); const [open, setOpen] = useState(false); const [mobile, setMobile] = useState(false);
  useEffect(() => { const media = window.matchMedia("(max-width: 767px)"); const sync = () => setMobile(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  const mine = notifications.filter((item) => canReceiveNotification(item, roles) && item.status !== "dismissed" && item.status !== "expired"); const unread = mine.filter((item) => item.status === "unread").length; const recent = mine.slice(0, 5);
  const list = <div className="notification-popover__list">{recent.map((item) => <Link key={item.id} href={item.deepLink} data-unread={item.status === "unread" || undefined} onClick={() => { markNotificationRead(item.id, identity.userId); setOpen(false); }}><span><strong>{item.title}</strong><small>{relativeNotificationTime(item.createdAt)}</small></span><NotificationPriorityBadge priority={item.priority} /></Link>)}<Link className="notification-popover__all" href="/notifications" onClick={() => setOpen(false)}>عرض كل الإشعارات</Link></div>;
  return <div className="notification-bell"><IconButton label={`الإشعارات — ${unread} غير مقروءة`} className="notification-button" onClick={() => setOpen(true)}><Bell aria-hidden />{unread ? <span className="notification-button__count">{unread.toLocaleString("ar-EG-u-nu-latn")}</span> : null}</IconButton>{open && !mobile ? <div className="notification-popover" role="dialog" aria-label="آخر الإشعارات"><header><strong>الإشعارات</strong><button onClick={() => setOpen(false)}>إغلاق</button></header>{list}</div> : null}{mobile ? <Drawer open={open} onOpenChange={setOpen} title="آخر الإشعارات" description={`${unread.toLocaleString("ar-EG-u-nu-latn")} غير مقروءة`} variant="bottom-sheet"><div className="notification-mobile-sheet">{list}</div></Drawer> : null}</div>;
}
