"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useRentals } from "../hooks/use-rentals";
import { calculateRentalSettlement } from "../services/rental-rules";
import { durationLabels, money, time } from "./rental-labels";
import { rentalAssetReference } from "./rental-asset-reference";
import { rentalPaymentLabel } from "./rental-payment-label";

export function RentalInvoicePage({ rentalId }: { rentalId: string }) {
  const { rentals, assets } = useRentals();
  const customers = useCustomers();
  const branches = useBranches();
  const rental = rentals.find((item) => item.id === rentalId);

  if (!rental) return <main className="rental-invoice-page"><section className="rental-invoice-document"><h1>الفاتورة غير موجودة</h1></section></main>;

  const asset = assets.find((item) => item.id === rental.assetId);
  const customer = customers.find((item) => item.id === rental.customerId);
  const branch = branches.find((item) => item.id === rental.branchId);
  const total = rental.status === "completed" ? rental.currentAmount : rental.quotedAmount;
  const settlement = calculateRentalSettlement(total, rental.paidAmount);
  const invoiceAvailable = rental.paidAmount >= total && total > 0;
  const invoiceNumber = rental.rentalNumber.replace("RNT-", "INV-");

  if (!invoiceAvailable) return <main className="rental-invoice-page"><section className="rental-invoice-document"><h1>الفاتورة غير جاهزة</h1><p>يجب تسجيل الدفع أولًا قبل إصدار الفاتورة.</p></section></main>;

  return (
    <main className="rental-invoice-page">
      <div className="rental-invoice-toolbar" aria-label="إجراءات الفاتورة">
        <Link className="ui-button ui-button--secondary ui-button--md" href={`/rentals/${rental.id}`}>العودة للتأجير</Link>
        <Button variant="primary" icon={<Printer size={17} />} onClick={() => window.print()}>طباعة أو حفظ PDF</Button>
      </div>

      <article className="rental-invoice-document" aria-label={`فاتورة ${invoiceNumber}`}>
        <header className="rental-invoice-header">
          <div><strong>L3BTY</strong><span>لعبتي للتأجير</span></div>
          <div><h1>فاتورة تأجير</h1><bdi dir="ltr">{invoiceNumber}</bdi></div>
        </header>

        <section className="rental-invoice-meta">
          <div><span>رقم عملية التأجير</span><bdi dir="ltr">{rental.rentalNumber}</bdi></div>
          <div><span>تاريخ الفاتورة</span><strong>{rental.workDate}</strong></div>
          <div><span>الفرع</span><strong>{branch?.name ?? "فرع غير معروف"}</strong></div>
          <div><span>طريقة الدفع</span><strong>{rentalPaymentLabel(rental.paymentMethod)}</strong></div>
        </section>

        <section className="rental-invoice-parties">
          <div><span>العميل</span><strong>{customer?.name ?? "—"}</strong><bdi dir="ltr">{customer?.primaryPhone ?? ""}</bdi></div>
          <div><span>اللعبة</span><strong>{asset?.name ?? "—"}</strong><bdi dir="ltr">{rentalAssetReference(asset?.assetNumber, asset?.barcode)}</bdi></div>
        </section>

        <table className="rental-invoice-table">
          <thead><tr><th>البيان</th><th>البداية</th><th>النهاية</th><th>القيمة</th></tr></thead>
          <tbody><tr><td>{durationLabels[rental.durationType]}</td><td>{time(rental.startedAt)}</td><td>{rental.closedAt ? time(rental.closedAt) : "مستمر"}</td><td>{money(total)}</td></tr></tbody>
        </table>

        <section className="rental-invoice-totals">
          <div><span>إجمالي الفاتورة</span><strong>{money(total)}</strong></div>
          <div><span>المبلغ المستلم</span><strong>{money(rental.paidAmount)}</strong></div>
          <div className="rental-invoice-change"><span>الباقي للعميل</span><strong>{money(settlement.customerChange)}</strong></div>
          <div><span>حالة الدفع</span><strong>مدفوع بالكامل</strong></div>
        </section>

        <footer><p>شكرًا لاستخدامكم L3BTY</p><small>فاتورة صادرة إلكترونيًا من نظام لعبتي.</small></footer>
      </article>
    </main>
  );
}
