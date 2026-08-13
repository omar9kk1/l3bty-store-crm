"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CarFront, ChevronUp, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { RentalWhatsAppAction } from "@/features/rentals/components/RentalWhatsAppAction";
import { rentalStatusLabels } from "@/features/rentals/components/rental-labels";
import { useRentalClock } from "@/features/rentals/hooks/use-rental-clock";
import { useRentalReminderEvaluation } from "@/features/rentals/hooks/use-rental-reminders";
import { useRentals } from "@/features/rentals/hooks/use-rentals";
import { canViewRentals } from "@/features/rentals/permissions";
import { getRentalTimerView } from "@/features/rentals/services/rental-timer-view";
import { useShell } from "./ShellContext";

const ACTIVE_RENTAL_STATUSES = ["active", "near_end", "additional_time"];

export function ActiveRentalStrip() {
  useRentalReminderEvaluation();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const { roles, availableBranches } = useShell();
  const { rentals, assets } = useRentals();
  const customers = useCustomers();
  const branches = useBranches();
  const allowed = new Set(availableBranches.map((branch) => branch.id));
  const routeRentalId = pathname.match(/^\/rentals\/([^/]+)/)?.[1];
  const isVisibleRental = (item: (typeof rentals)[number]) =>
    ACTIVE_RENTAL_STATUSES.includes(item.status) && (allowed.has("all") || allowed.has(item.branchId));
  const routeRental = routeRentalId
    ? rentals.find((item) => item.id === routeRentalId && isVisibleRental(item))
    : undefined;
  const rental = routeRental ?? rentals.find(isVisibleRental);
  const referenceMs = useRentalClock(Boolean(visible && canViewRentals(roles) && rental?.startedAt));
  if (!visible || !canViewRentals(roles) || !rental?.startedAt) return null;
  const asset = assets.find((item) => item.id === rental.assetId);
  const customer = customers.find((item) => item.id === rental.customerId);
  const branch = branches.find((item) => item.id === rental.branchId);
  const timer = getRentalTimerView(rental, referenceMs);
  const reminderVisible = ["due", "opened", "failed_to_open", "customer_phone_missing"].includes(rental.reminderStatus);

  return (
    <div className="active-rental-strip" aria-label="عداد تأجير نشط">
      <div className="active-rental-strip__inner">
        <CarFront aria-hidden size={16} />
        <strong>{asset?.name}</strong>
        {expanded ? <span className="active-rental-strip__meta">{customer?.name} · {branch?.name} · {rentalStatusLabels[rental.status]}</span> : null}
        {reminderVisible ? <Badge tone="warning">متبقي 5 دقائق</Badge> : null}
        <bdi dir="ltr" className="active-rental-strip__timer" aria-label={`${timer.label} ${timer.value}`} style={{ color: timer.tone === "danger" ? "var(--status-danger)" : timer.tone === "neutral" ? "rgb(255 255 255 / 70%)" : "var(--accent)" }}>{timer.value}</bdi>
        {reminderVisible && asset && customer && branch ? <RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="reminder" compact /> : null}
        <Link href={`/rentals/${rental.id}`}>التفاصيل</Link>
        <button type="button" aria-label={expanded ? "طي التفاصيل" : "عرض التفاصيل"} onClick={() => setExpanded((value) => !value)}><ChevronUp aria-hidden size={16} className={expanded ? "" : "is-collapsed"} /></button>
        <button type="button" aria-label="إخفاء عداد التأجير" onClick={() => setVisible(false)}><X aria-hidden size={16} /></button>
      </div>
    </div>
  );
}


