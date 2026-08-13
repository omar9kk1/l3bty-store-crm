import { Suspense } from "react";
import { MyActivityPage } from "@/features/audit-log/components/MyActivityPage";
export default function Page() { return <Suspense fallback={<div className="activity-skeleton" aria-label="جار تحميل النشاط الشخصي" />}><MyActivityPage /></Suspense>; }
