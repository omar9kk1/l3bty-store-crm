import { Suspense } from "react";
import { DashboardPage } from "@/features/dashboard/components/DashboardPage";
import { DashboardSkeleton } from "@/features/dashboard/components/DashboardStates";

export default function Page() {
  return <Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense>;
}
