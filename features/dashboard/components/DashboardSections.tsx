"use client";

import Link from "next/link";
import { ArrowUpLeft, Clock3 } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import type { DashboardModel } from "../types";

const money = new Intl.NumberFormat("ar-EG-u-nu-latn");

function SectionHeading({ title, href, linkLabel = "عرض الكل" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="dashboard-section-heading">
      <h2>{title}</h2>
      {href ? <Link href={href}>{linkLabel}<ArrowUpLeft size={15} /></Link> : null}
    </div>
  );
}

export function BranchPerformanceCard({ branches, onSelect }: { branches: DashboardModel["branches"]; onSelect: (id: string) => void }) {
  const max = Math.max(...branches.map((branch) => branch.total), 1);
  return (
    <section className="dashboard-card dashboard-card--wide" aria-labelledby="branch-performance-title">
      <div className="dashboard-section-heading"><h2 id="branch-performance-title">أداء الفروع</h2><span>حسب النشاط المحدد</span></div>
      <div className="branch-performance-list">
        {branches.map((branch) => (
          <button key={branch.id} type="button" className="branch-performance-row" onClick={() => onSelect(branch.id)}>
            <span className="branch-performance-row__identity"><strong>{branch.name}</strong><small>{branch.code}</small></span>
            <span className="branch-performance-row__bar"><i style={{ inlineSize: `${(branch.total / max) * 100}%` }} /></span>
            <span className="branch-performance-row__values"><b>{money.format(branch.total)} ج.م</b><small>بيع {money.format(branch.sales)} · تأجير {money.format(branch.rental)} · صيانة {money.format(branch.maintenance)}</small></span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function RentalUtilizationCard({ utilization }: { utilization: DashboardModel["utilization"] }) {
  return (
    <section className="dashboard-card" aria-labelledby="rental-utilization-title">
      <SectionHeading title="استغلال أصول التأجير" href="/rental-assets" />
      <div className="utilization-layout">
        <div className="utilization-ring" style={{ "--utilization": `${utilization.percent * 3.6}deg` } as React.CSSProperties}><strong>{utilization.percent}٪</strong><span>مستغلة</span></div>
        <dl className="dashboard-stats-list">
          <div><dt>قيد التأجير</dt><dd>{utilization.rented}</dd></div>
          <div><dt>متاحة</dt><dd>{utilization.available}</dd></div>
          <div><dt>في الصيانة</dt><dd>{utilization.maintenance}</dd></div>
        </dl>
      </div>
    </section>
  );
}

export function ActiveRentalsCard({ rentals }: { rentals: DashboardModel["rentals"] }) {
  return (
    <section className="dashboard-card" aria-labelledby="active-rentals-title">
      <SectionHeading title="التأجيرات النشطة" href="/rentals" />
      <div className="dashboard-list">
        {rentals.map((rental) => (
          <Link href="/rentals" key={rental.id} className="dashboard-list-row">
            <span className="dashboard-list-row__icon"><AppIcon name="rentals" size={18} /></span>
            <span><strong>{rental.asset}</strong><small>{rental.customer} · {rental.code}</small></span>
            <span className="dashboard-list-row__aside"><b><Clock3 size={14} />{rental.clock}</b><small>{rental.status}</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MaintenanceSummaryCard({ items }: { items: DashboardModel["maintenance"] }) {
  return (
    <section className="dashboard-card" aria-labelledby="maintenance-summary-title">
      <SectionHeading title="ملخص الصيانة" href="/maintenance" />
      <div className="maintenance-status-grid">
        {items.map((item) => <div key={item.label}><strong>{item.count}</strong><span>{item.label}</span></div>)}
      </div>
    </section>
  );
}

export function StockAlertsCard({ items }: { items: DashboardModel["stock"] }) {
  return (
    <section className="dashboard-card" aria-labelledby="stock-alerts-title">
      <SectionHeading title="تنبيهات المخزون" href="/inventory" />
      <div className="dashboard-list">
        {items.map((item) => (
          <Link href="/inventory" key={item.id} className="dashboard-list-row">
            <span className="dashboard-list-row__icon dashboard-list-row__icon--warning"><AppIcon name="inventory" size={18} /></span>
            <span><strong>{item.name}</strong><small>{item.branch} · الحد الأدنى {item.minimum}</small></span>
            <span className="dashboard-list-row__aside"><b>{item.current}</b><small>{item.severity}</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AttendanceSummaryCard({ items, management }: { items: DashboardModel["attendance"]; management: boolean }) {
  return (
    <section className="dashboard-card" aria-labelledby="attendance-summary-title">
      <SectionHeading title={management ? "الحضور اليوم" : "حضوري اليوم"} href="/attendance" />
      <div className="attendance-summary">
        {items.map((item) => <div key={item.label}><strong>{item.count}</strong><span>{item.label}</span></div>)}
      </div>
    </section>
  );
}

export function AlertsApprovalsCard({ items }: { items: DashboardModel["alerts"] }) {
  return (
    <section className="dashboard-card" aria-labelledby="alerts-title">
      <SectionHeading title="تنبيهات تحتاج انتباهك" href="/notifications" />
      <div className="dashboard-list">
        {items.map((item) => (
          <Link href={item.href} key={item.id} className="dashboard-list-row">
            <span className={`dashboard-alert-dot${item.unread ? " dashboard-alert-dot--unread" : ""}`} />
            <span><strong>{item.title}</strong><small>{item.branch} · {item.reference}</small></span>
            <span className="dashboard-list-row__aside"><b>{item.status}</b><small>{item.time}</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
