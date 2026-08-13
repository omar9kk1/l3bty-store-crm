import { Activity, CalendarDays, FileText, UserRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Customer, CustomerAccess } from "../types";

export function CustomerOverview({ customer, access }: { customer: Customer; access: CustomerAccess }) {
  const items = [
    { label: "إجمالي العمليات المتاحة", value: (access.canViewSales ? customer.totalSales : 0) + (access.canViewRentals ? customer.totalRentals : 0) + (access.canViewMaintenance ? customer.totalMaintenanceOrders : 0), icon: Activity },
    { label: "أوامر الصيانة", value: access.canViewMaintenance ? customer.totalMaintenanceOrders : "—", icon: FileText },
    { label: "الملاحظات", value: access.canViewFullTimeline ? customer.notesCount : "—", icon: UserRound },
    { label: "تاريخ الإنشاء", value: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(customer.createdAt)), icon: CalendarDays },
  ];
  return <section className="customer-overview" aria-label="نظرة عامة">{items.map((item) => <Card className="customer-overview__item" key={item.label}><item.icon aria-hidden size={18} /><span>{item.label}</span><strong>{typeof item.value === "number" ? item.value.toLocaleString("ar-EG-u-nu-latn") : item.value}</strong></Card>)}</section>;
}
