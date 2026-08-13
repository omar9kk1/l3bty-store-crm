import type { Trend } from "../types";

interface SparklineProps {
  values: readonly number[];
  trend: Trend;
}

export function Sparkline({ values, trend }: SparklineProps) {
  const width = 132;
  const height = 42;
  const min = Math.min(...values);
  const range = Math.max(Math.max(...values) - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - 4 - ((value - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className="dashboard-sparkline"
      data-testid="dashboard-sparkline"
      data-trend={trend}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`اتجاه ${trend === "up" ? "صاعد" : trend === "down" ? "هابط" : "مستقر"}`}
    >
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
