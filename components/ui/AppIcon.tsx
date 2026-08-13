import {
  Activity,
  ArrowLeftRight,
  Bell,
  Boxes,
  Building2,
  CalendarCheck2,
  ChartNoAxesCombined,
  ClipboardList,
  Clock3,
  CreditCard,
  FileClock,
  Gamepad2,
  Gauge,
  HandCoins,
  LayoutGrid,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { NavigationIcon } from "@/permissions/types";

const icons: Record<NavigationIcon, LucideIcon> = {
  dashboard: Gauge,
  operations: LayoutGrid,
  rentals: Gamepad2,
  sales: ShoppingCart,
  maintenance: Wrench,
  customers: Users,
  products: Package,
  assets: ShieldCheck,
  inventory: Boxes,
  transfers: ArrowLeftRight,
  employees: Users,
  attendance: CalendarCheck2,
  shifts: Clock3,
  finance: WalletCards,
  expenses: ReceiptText,
  payroll: HandCoins,
  reports: ChartNoAxesCombined,
  branches: Building2,
  notifications: Bell,
  audit: FileClock,
  settings: Settings,
};

export type AppIconName = NavigationIcon | "activity" | "card" | "clipboard";

const utilityIcons: Record<"activity" | "card" | "clipboard", LucideIcon> = {
  activity: Activity,
  card: CreditCard,
  clipboard: ClipboardList,
};

interface AppIconProps extends Omit<LucideProps, "name"> {
  name: AppIconName;
  decorative?: boolean;
}

export function AppIcon({
  name,
  size = 20,
  strokeWidth = 1.8,
  decorative = true,
  ...props
}: AppIconProps) {
  const Icon = name in icons
    ? icons[name as NavigationIcon]
    : utilityIcons[name as keyof typeof utilityIcons];

  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={decorative || undefined}
      {...props}
    />
  );
}
