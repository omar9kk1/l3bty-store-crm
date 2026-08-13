import { AppIcon } from "@/components/ui/AppIcon";
import type { DashboardMetric } from "../types";
import { Sparkline } from "./Sparkline";

const numberFormatter = new Intl.NumberFormat("ar-EG-u-nu-latn");

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <article className="dashboard-metric-card" data-metric={metric.key}>
      <div className="dashboard-metric-card__top">
        <span className="dashboard-metric-card__icon"><AppIcon name={metric.icon} size={20} /></span>
        {metric.comparison ? <span className={`dashboard-trend dashboard-trend--${metric.trend}`}>{metric.comparison}</span> : null}
      </div>
      <p className="dashboard-metric-card__label">{metric.label}</p>
      <div className="dashboard-metric-card__value">
        <strong>{numberFormatter.format(metric.value)}</strong>
        {metric.unit ? <span>{metric.unit}</span> : null}
      </div>
      <div className="dashboard-metric-card__footer">
        <small>{metric.description}</small>
        {metric.sparkline ? <Sparkline values={metric.sparkline} trend={metric.trend} /> : null}
      </div>
    </article>
  );
}
