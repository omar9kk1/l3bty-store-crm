import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import type { RoleId } from "@/permissions/types";
import { isManagementDashboard } from "../permissions";

interface Action { label: string; href: string; icon: AppIconName }

export function QuickActions({ roles }: { roles: readonly RoleId[] }) {
  const actions: Action[] = [];
  if (isManagementDashboard(roles)) actions.push(
    { label: "إنشاء فاتورة بيع", href: "/sales/pos", icon: "sales" },
    { label: "تأجير جديد", href: "/rentals", icon: "rentals" },
    { label: "طلب صيانة", href: "/maintenance", icon: "maintenance" },
    { label: "عرض التقارير", href: "/reports", icon: "reports" },
  );
  if (roles.includes("sales_employee")) actions.push({ label: "إنشاء فاتورة بيع", href: "/sales/pos", icon: "sales" }, { label: "فحص المخزون", href: "/inventory", icon: "inventory" });
  if (roles.includes("rental_maintenance_employee")) actions.push({ label: "تأجير جديد", href: "/rentals", icon: "rentals" }, { label: "استلام صيانة", href: "/maintenance", icon: "maintenance" });
  if (roles.includes("maintenance_technician")) actions.push({ label: "عرض البلاغات", href: "/maintenance", icon: "notifications" }, { label: "فحص قطع الغيار", href: "/inventory", icon: "inventory" });
  const unique = [...new Map(actions.map((action) => [action.href + action.label, action])).values()];

  return (
    <section className="dashboard-quick-actions" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title">إجراءات سريعة</h2>
      <div>
        {unique.map((action) => <Link href={action.href} key={action.label}><AppIcon name={action.icon} size={18} /><span>{action.label}</span><ArrowUpLeft size={15} /></Link>)}
      </div>
    </section>
  );
}
