import { Suspense } from "react";
import { ActivityLogPage } from "@/features/audit-log/components/ActivityLogPage";
export default function Page() { return <Suspense fallback={<div className="activity-skeleton" aria-label="جار تحميل سجل النشاط" />}><ActivityLogPage /></Suspense>; }
