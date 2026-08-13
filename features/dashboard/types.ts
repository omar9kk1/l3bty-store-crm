import type { AppIconName } from "@/components/ui/AppIcon";

export type DashboardPeriod = "today" | "week" | "month";
export type DashboardActivityType = "all" | "sales" | "rental" | "maintenance";
export type DashboardState = "normal" | "loading" | "empty" | "error" | "offline";
export type DashboardMode = "management" | "sales" | "rental" | "technician" | "combined";
export type Trend = "up" | "down" | "neutral";

export interface DashboardQuery {
  period: DashboardPeriod;
  type: DashboardActivityType;
  state: DashboardState;
  branchId: string;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  comparison?: string;
  description: string;
  trend: Trend;
  icon: AppIconName;
  sparkline?: readonly number[];
}

export interface BranchPerformance {
  id: string;
  name: string;
  code: string;
  sales: number;
  rental: number;
  maintenance: number;
  total: number;
}

export interface RentalRow {
  id: string;
  asset: string;
  code: string;
  customer: string;
  clock: string;
  status: "نشط" | "اقترب الانتهاء" | "متبقي 5 دقائق" | "وقت إضافي";
  amount: number;
}

export interface StockAlert {
  id: string;
  name: string;
  category: "sale_game" | "spare_part" | "rental_asset";
  branch: string;
  current: string;
  minimum: string;
  severity: "متوسط" | "مرتفع";
}

export interface AlertItem {
  id: string;
  title: string;
  reference: string;
  branch: string;
  time: string;
  status: string;
  href: string;
  unread: boolean;
}

export interface DashboardModel {
  mode: DashboardMode;
  metrics: DashboardMetric[];
  branches: BranchPerformance[];
  utilization: { percent: number; rented: number; available: number; maintenance: number };
  rentals: RentalRow[];
  maintenance: Array<{ label: string; count: number }>;
  stock: StockAlert[];
  attendance: Array<{ label: string; count: number }>;
  alerts: AlertItem[];
  lastUpdated: string;
}
