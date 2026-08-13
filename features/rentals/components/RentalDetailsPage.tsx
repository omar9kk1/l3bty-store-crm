"use client";

import Link from "next/link";
import { Clock3, Printer } from "lucide-react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { useRentalClock } from "../hooks/use-rental-clock";
import { useRentals } from "../hooks/use-rentals";
import { canAccessRentalBranch, canManageRentals } from "../permissions";
import { calculateOpenAmount, calculateOpenSeconds } from "../services/rental-rules";
import { getRentalTimerView } from "../services/rental-timer-view";
import { durationLabels, money, rentalStatusLabels, statusTone, time } from "./rental-labels";
import { RentalAssetChangeControl } from "./RentalAssetChangeControl";
import { RentalReminderPanel } from "./RentalReminderPanel";
import { RentalWhatsAppAction } from "./RentalWhatsAppAction";

export function RentalDetailsPage({ rentalId }: { rentalId: string }) {
  const { roles, permissions, availableBranches } = useShell();
  const { rentals, assets } = useRentals();
  const customers = useCustomers();
  const branches = useBranches();
  const employees = useEmployees();
  const rental = rentals.find((item) => item.id === rentalId);
  const active = Boolean(rental && ["active", "near_end", "additional_time"].includes(rental.status));
  const referenceMs = useRentalClock(active);
  if (!permissions.has(PERMISSION_KEYS.rentals) || !canManageRentals(roles)) return <PermissionDeniedState />;

  if (!rental) return <Card className="rental-state"><h2>التأجير غير موجود</h2></Card>;
  if (!canAccessRentalBranch(roles, rental.branchId, availableBranches.map((item) => item.id))) return <PermissionDeniedState />;
  const asset = assets.find((item) => item.id === rental.assetId);
  const customer = customers.find((item) => item.id === rental.customerId);
  const branch = branches.find((item) => item.id === rental.branchId);
  const timerReferenceIso = rental.closedAt ?? new Date(referenceMs).toISOString();
  const seconds = rental.startedAt ? calculateOpenSeconds(rental.startedAt, timerReferenceIso) : 0;
  const timer = getRentalTimerView(rental, rental.closedAt ? new Date(rental.closedAt).getTime() : referenceMs);
  const current = rental.durationType === "open_time" && active
    ? calculateOpenAmount(seconds, rental.pricePerHour)
    : rental.currentAmount;

  return (
    <div className="rentals-page rental-details-page">
      <header className="rentals-header"><div><span>{rental.rentalNumber}</span><h2>{asset?.name}</h2><p>{customer?.name} · {branch?.name}</p></div><Badge tone={statusTone(rental.status)}>{rentalStatusLabels[rental.status]}</Badge></header>
      {asset && customer && branch ? <RentalReminderPanel rental={rental} asset={asset} customer={customer} branch={branch} /> : null}
      <section className="rental-detail-grid">
        <Card className="rental-hero"><span>العداد</span><strong dir="ltr" style={{ color: timer.tone === "danger" ? "var(--status-danger)" : timer.tone === "neutral" ? "rgb(255 255 255 / 70%)" : "var(--accent)" }}>{timer.value}</strong><small>{timer.label}</small></Card>
        <Card><h3>التوقيت والمدة</h3><dl><div><dt>النوع</dt><dd>{durationLabels[rental.durationType]}</dd></div><div><dt>البداية</dt><dd>{time(rental.startedAt)}</dd></div><div><dt>النهاية المتوقعة</dt><dd>{time(rental.expectedEndAt)}</dd></div><div><dt>تاريخ الوردية</dt><dd>{rental.workDate}</dd></div></dl></Card>
        <Card><h3>التسوية الحالية</h3><dl><div><dt>القيمة الحالية</dt><dd>{money(current)}</dd></div><div><dt>المدفوع</dt><dd>{money(rental.paidAmount)}</dd></div><div><dt>المتبقي</dt><dd>{money(Math.max(0, current - rental.paidAmount))}</dd></div><div><dt>طريقة الدفع</dt><dd>{rental.paymentMethod}</dd></div></dl></Card>
        <Card><h3>بيانات التشغيل</h3><dl><div><dt>الموظف</dt><dd>{employees.find((employee) => employee.id === rental.employeeId)?.name}</dd></div><div><dt>الأصل</dt><dd><Link href={`/rental-assets/${asset?.id}`}>{asset?.assetNumber}</Link></dd></div><div><dt>العميل</dt><dd><Link href={`/customers/${customer?.id}`}>{customer?.customerNumber}</Link></dd></div></dl></Card>
      </section>
      <Card className="rental-actions">
        {active ? <><Link className="ui-button ui-button--secondary ui-button--md" href={`/rentals/${rental.id}/extend`}>تمديد</Link><Link className="ui-button ui-button--primary ui-button--md" href={`/rentals/${rental.id}/close`}>إنهاء</Link></> : null}
        <Button icon={<Printer size={16} />} onClick={() => window.print()}>إيصال Mock</Button>
        {asset && customer && branch ? <RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="invoice" /> : null}
        <RentalAssetChangeControl rental={rental} assets={assets} />
      </Card>
      <Card className="rental-timeline"><h3><Clock3 size={18} />سجل الأحداث</h3>{rental.events.map((event) => <div key={event.id}><strong>{event.note}</strong><span>{time(event.at)} · {event.by}</span></div>)}</Card>
    </div>
  );
}



