"use client";

import Link from "next/link";
import { BellRing } from "lucide-react";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useRentalReminderEvaluation } from "../hooks/use-rental-reminders";
import { useRentals } from "../hooks/use-rentals";
import { canViewRentals } from "../permissions";

export function RentalReminderCenter({ mode }: { mode: "operations" | "notifications" }) {
  useRentalReminderEvaluation();
  const { roles, availableBranches } = useShell();
  const { rentals, assets, rentalNotifications } = useRentals();
  const customers = useCustomers();
  const branches = useBranches();
  if (!canViewRentals(roles)) return null;

  const allowed = new Set(availableBranches.map((branch) => branch.id));
  const notifications = rentalNotifications.filter((item) => allowed.has("all") || allowed.has(item.branchId));
  return (
    <Card className="rental-reminder-center">
      <header>
        <div><span><BellRing size={19} /></span><div><h3>{mode === "operations" ? "تنبيهات انتهاء التأجير" : "تذكيرات التأجير"}</h3><p>تنبيهات Mock تظهر أثناء تشغيل التطبيق فقط.</p></div></div>
        <Badge tone={notifications.length ? "warning" : "neutral"}>{notifications.length.toLocaleString("ar-EG-u-nu-latn")}</Badge>
      </header>
      {notifications.length ? notifications.map((notification) => {
        const rental = rentals.find((item) => item.id === notification.rentalId);
        const asset = assets.find((item) => item.id === rental?.assetId);
        const customer = customers.find((item) => item.id === rental?.customerId);
        const branch = branches.find((item) => item.id === rental?.branchId);
        return rental && asset && customer && branch ? (
          <div className="rental-reminder-center__item" key={notification.id}>
            <div><strong>{notification.title} · {asset.name}</strong><span>{customer.name} · {branch.name} · {rental.rentalNumber}</span></div>
            <Link href={`/rentals/${rental.id}`}>فتح التأجير والتذكير</Link>
          </div>
        ) : null;
      }) : <p>لا توجد تذكيرات مستحقة حاليًا.</p>}
      <small>الإرسال التلقائي المضمون عند إغلاق التطبيق يحتاج Backend Scheduler وWhatsApp API لاحقًا.</small>
    </Card>
  );
}
