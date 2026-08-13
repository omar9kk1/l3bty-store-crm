"use client";

import { Download, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DashboardPeriod } from "../types";

const periods: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
];

interface DashboardHeaderProps {
  period: DashboardPeriod;
  lastUpdated: string;
  canExport: boolean;
  offline: boolean;
  onPeriodChange: (period: DashboardPeriod) => void;
  onOpenFilters: () => void;
  onExport: () => void;
}

export function DashboardHeader(props: DashboardHeaderProps) {
  return (
    <header className="dashboard-heading">
      <div className="dashboard-heading__copy">
        <span className="dashboard-eyebrow">نظرة تشغيلية</span>
        <h1>لوحة التحكم</h1>
        <p>متابعة موجزة لأهم مؤشرات النشاط · آخر تحديث {props.lastUpdated}</p>
      </div>
      <div className="dashboard-heading__controls">
        <div className="dashboard-period-tabs" aria-label="الفترة الزمنية">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={props.period === item.value}
              onClick={() => props.onPeriodChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="dashboard-heading__actions">
          <Button data-testid="dashboard-filters-trigger" size="sm" icon={<SlidersHorizontal size={17} />} onClick={props.onOpenFilters}>تصفية</Button>
          {props.canExport ? (
            <Button size="sm" icon={<Download size={17} />} disabled={props.offline} onClick={props.onExport}>تصدير</Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
