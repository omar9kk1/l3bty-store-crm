"use client";

import Link from "next/link";
import { Clock3, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { useRentalClock } from "../hooks/use-rental-clock";
import { useRentals } from "../hooks/use-rentals";
import { canAccessRentalBranch, canOperateRentals, canViewRentals } from "../permissions";
import { calculateRentalLiveAmount, calculateRentalSettlement } from "../services/rental-rules";
import { getRentalTimerView, isRentalAwaitingDecision } from "../services/rental-timer-view";
import { durationLabels, money, rentalStatusLabels, statusTone, time } from "./rental-labels";
import { rentalPaymentLabel } from "./rental-payment-label";
import { RentalAssetChangeControl } from "./RentalAssetChangeControl";
import { RentalReminderPanel } from "./RentalReminderPanel";
import { RentalWhatsAppAction } from "./RentalWhatsAppAction";

export function RentalDetailsPage({ rentalId }: { rentalId: string }) {
  const searchParams = useSearchParams();
  const { roles, permissions, availableBranches } = useShell();
  const { rentals, assets } = useRentals();
  const customers = useCustomers();
  const branches = useBranches();
  const employees = useEmployees();
  const rental = rentals.find((item) => item.id === rentalId);
  const active = Boolean(rental && ["active", "near_end", "additional_time"].includes(rental.status));
  const referenceMs = useRentalClock(active);
  const operational = canOperateRentals(roles);
  if (!permissions.has(PERMISSION_KEYS.rentals) || !canViewRentals(roles)) return <PermissionDeniedState />;

  if (!rental) return <Card className="rental-state"><h2>التأجير غير موجود</h2></Card>;
  if (!canAccessRentalBranch(roles, rental.branchId, availableBranches.map((item) => item.id))) return <PermissionDeniedState />;
  const asset = assets.find((item) => item.id === rental.assetId);
  const customer = customers.find((item) => item.id === rental.customerId);
  const branch = branches.find((item) => item.id === rental.branchId);
  const timer = getRentalTimerView(rental, rental.closedAt ? new Date(rental.closedAt).getTime() : referenceMs);
  const awaitingDecision = operational && isRentalAwaitingDecision(rental, referenceMs);
  const current = calculateRentalLiveAmount(rental, rental.closedAt ? new Date(rental.closedAt).getTime() : referenceMs);
  const settlement = calculateRentalSettlement(current, rental.paidAmount);
  const fullyPaid = settlement.amountDue === 0;
  const invoiceTotal = rental.status === "completed" ? current : rental.quotedAmount;
  const invoiceSettlement = calculateRentalSettlement(invoiceTotal, rental.paidAmount);
  const invoiceAvailable = (rental.durationType !== "open_time" && rental.status !== "cancelled" && rental.paidAmount >= rental.quotedAmount) || (rental.status === "completed" && fullyPaid);
  const receiptReady = invoiceAvailable && searchParams.get("receipt") === "ready";

  return (
    <div className="rentals-page rental-details-page">
      <header className="rentals-header"><div><span>{rental.rentalNumber}</span><h2>{asset?.name}</h2><p>{customer?.name} · {branch?.name}</p></div><Badge tone={statusTone(rental.status)}>{rentalStatusLabels[rental.status]}</Badge></header>
      {receiptReady && asset && customer && branch ? <Card className="rental-receipt-ready" role="status">
        <div><h3>تم الدفع وإصدار الفاتورة</h3><p>{active ? "بدأ وقت اللعب ويمكن إرسال الفاتورة أو طباعتها الآن." : "تم إنهاء التأجير ويمكن إرسال الفاتورة أو طباعتها الآن."}</p></div>
        <div className="rental-actions">
          <RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="invoice" totalAmount={rental.status === "completed" ? current : rental.quotedAmount} />
          <Link className="ui-button ui-button--primary ui-button--md" href={`/rental-invoices/${rental.id}`} target="_blank"><Printer size={16} />عرض وطباعة الفاتورة</Link>
        </div>
      </Card> : null}
      {operational && asset && customer && branch ? <RentalReminderPanel rental={rental} asset={asset} customer={customer} branch={branch} /> : null}
      {awaitingDecision ? <Card className="rental-end-decision rental-end-decision--details" role="alert"><div><strong>انتهى وقت التأجير</strong><span>اختر تمديد المدة أو إنهاء التأجير. لن يُضاف وقت أو مبلغ تلقائيًا.</span></div><div><Link className="ui-button ui-button--secondary ui-button--md" href={`/rentals/${rental.id}/extend`}>تمديد</Link><Link className="ui-button ui-button--primary ui-button--md" href={`/rentals/${rental.id}/close`}>إنهاء</Link></div></Card> : null}
      <section className="rental-detail-grid">
        <Card className="rental-hero"><span>العداد</span><strong dir="ltr" style={{ color: timer.tone === "danger" ? "var(--status-danger)" : timer.tone === "neutral" ? "rgb(255 255 255 / 70%)" : "var(--accent)" }}>{timer.value}</strong><small>{timer.label}</small></Card>
        <Card><h3>التوقيت والمدة</h3><dl><div><dt>النوع</dt><dd>{durationLabels[rental.durationType]}</dd></div><div><dt>البداية</dt><dd>{time(rental.startedAt)}</dd></div><div><dt>النهاية المتوقعة</dt><dd>{time(rental.expectedEndAt)}</dd></div><div><dt>تاريخ الوردية</dt><dd>{rental.workDate}</dd></div></dl></Card>
        <Card><h3>الدفع والفاتورة</h3><dl><div><dt>القيمة الحالية</dt><dd>{money(current)}</dd></div><div><dt>{rental.durationType === "open_time" && active ? "موعد الدفع" : "المبلغ المستلم"}</dt><dd>{rental.durationType === "open_time" && active ? "عند الإنهاء" : money(rental.paidAmount)}</dd></div>{invoiceAvailable ? <div><dt>الباقي للعميل</dt><dd>{money(invoiceSettlement.customerChange)}</dd></div> : null}<div><dt>حالة الفاتورة</dt><dd>{invoiceAvailable ? "صادرة" : "تصدر بعد الدفع"}</dd></div><div><dt>طريقة الدفع</dt><dd>{rentalPaymentLabel(rental.paymentMethod)}</dd></div></dl></Card>
        <Card><h3>بيانات التشغيل</h3><dl><div><dt>الموظف</dt><dd>{employees.find((employee) => employee.id === rental.employeeId)?.name}</dd></div><div><dt>رقم اللعبة</dt><dd><Link href={`/rental-assets/${asset?.id}`}><bdi dir="ltr">{asset?.barcode ?? asset?.assetNumber}</bdi></Link></dd></div><div><dt>العميل</dt><dd>{customer?.name} · {customer?.customerNumber}</dd></div></dl></Card>
      </section>
      {operational ? <Card className="rental-actions">
        {active && !awaitingDecision && rental.durationType !== "open_time" ? <Link className="ui-button ui-button--secondary ui-button--md" href={`/rentals/${rental.id}/extend`}>تمديد</Link> : null}
        {active && !awaitingDecision ? <Link className="ui-button ui-button--primary ui-button--md" href={`/rentals/${rental.id}/close`}>إنهاء</Link> : null}
        {invoiceAvailable && !receiptReady ? <Link className="ui-button ui-button--secondary ui-button--md" href={`/rental-invoices/${rental.id}`} target="_blank"><Printer size={16} />عرض وطباعة الفاتورة</Link> : null}
        {invoiceAvailable && !receiptReady && asset && customer && branch ? <RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="invoice" totalAmount={rental.status === "completed" ? current : rental.quotedAmount} /> : null}
        <RentalAssetChangeControl rental={rental} assets={assets} />
      </Card> : null}
      <Card className="rental-timeline"><h3><Clock3 size={18} />سجل الأحداث</h3>{rental.events.map((event) => <div key={event.id}><strong>{event.note}</strong><span>{time(event.at)} · {event.by}</span></div>)}</Card>
    </div>
  );
}



