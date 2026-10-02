"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useShell } from "@/components/shell/ShellContext";
import { allowedActivityTypes, dashboardVisibility } from "../permissions";
import { getDashboardData } from "../services/get-dashboard-data";
import type { DashboardActivityType, DashboardPeriod, DashboardState } from "../types";
import { AlertsApprovalsCard, ActiveRentalsCard, AttendanceSummaryCard, BranchPerformanceCard, MaintenanceSummaryCard, RentalUtilizationCard, StockAlertsCard } from "./DashboardSections";
import { DashboardFilters } from "./DashboardFilters";
import { DashboardHeader } from "./DashboardHeader";
import { MetricCard } from "./MetricCard";
import { QuickActions } from "./QuickActions";
import { DashboardEmptyState, DashboardErrorState, DashboardOfflineState, DashboardSkeleton } from "./DashboardStates";

const periods: DashboardPeriod[] = ["today", "week", "month"];
const states: DashboardState[] = ["normal", "loading", "empty", "error", "offline"];

export function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { roles, activeBranch, availableBranches, setActiveBranchId } = useShell();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const allowedTypes = useMemo(() => allowedActivityTypes(roles), [roles]);
  const requestedPeriod = searchParams.get("period") as DashboardPeriod | null;
  const requestedType = searchParams.get("type") as DashboardActivityType | null;
  const requestedState = searchParams.get("state") as DashboardState | null;
  const period = requestedPeriod && periods.includes(requestedPeriod) ? requestedPeriod : "today";
  const type = requestedType && allowedTypes.includes(requestedType) ? requestedType : allowedTypes[0] ?? "all";
  const state = requestedState && states.includes(requestedState) ? requestedState : "normal";
  const query = { period, type, state, branchId: activeBranch.id };
  const data = getDashboardData(query, roles);
  const visibility = dashboardVisibility(roles);

  function updateQuery(key: "period" | "type" | "state", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function selectBranch(branchId: string) {
    setActiveBranchId(branchId);
    setNotice("تم تحديث نطاق لوحة التحكم حسب الفرع المختار.");
  }

  if (state === "loading") return <DashboardSkeleton />;

  return (
    <div className="dashboard-page" data-dashboard-state={state}>
      {state === "offline" ? <DashboardOfflineState /> : null}
      <DashboardHeader period={period} lastUpdated={data.lastUpdated} onPeriodChange={(value) => updateQuery("period", value)} onOpenFilters={() => setFiltersOpen(true)} />
      <DashboardFilters open={filtersOpen} onOpenChange={setFiltersOpen} types={allowedTypes} selectedType={type} onTypeChange={(value) => updateQuery("type", value)} branches={availableBranches} branchId={activeBranch.id} onBranchChange={selectBranch} />
      {notice ? <div className="dashboard-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="إغلاق الرسالة">×</button></div> : null}
      {state === "empty" ? <DashboardEmptyState /> : state === "error" ? <DashboardErrorState onRetry={() => updateQuery("state", "normal")} /> : (
        <>
          <section className="dashboard-metrics" aria-label="المؤشرات الرئيسية">{data.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</section>
          <QuickActions roles={roles} />
          <div className="dashboard-panels">
            {visibility.branchPerformance ? <BranchPerformanceCard branches={data.branches} onSelect={selectBranch} /> : null}
            {visibility.rentalUtilization ? <RentalUtilizationCard utilization={data.utilization} /> : null}
            {visibility.activeRentals ? <ActiveRentalsCard rentals={data.rentals} /> : null}
            {visibility.maintenance ? <MaintenanceSummaryCard items={data.maintenance} /> : null}
            <StockAlertsCard items={data.stock} />
            <AttendanceSummaryCard items={data.attendance} management={visibility.management} />
            <AlertsApprovalsCard items={data.alerts} />
          </div>
        </>
      )}
    </div>
  );
}
