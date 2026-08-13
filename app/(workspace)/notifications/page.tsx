import { Suspense } from "react";
import { NotificationsPage } from "@/features/notifications/components/NotificationsPage";
export default function Page() { return <Suspense fallback={<div className="notification-skeleton" aria-label="جار تحميل الإشعارات" />}><NotificationsPage /></Suspense>; }
