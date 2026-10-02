"use client";

import Link from "next/link";
import { ArrowRight, Printer } from "lucide-react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useSales } from "../hooks/use-sales";
import { canAccessSaleBranch, canViewSales } from "../permissions";
import type { SaleInvoiceStatus, SalePaymentMethod, SaleReturnKind } from "../types";
import { SaleWhatsAppAction } from "./SaleWhatsAppAction";

const money = (value: number) => `${value.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 2 })} ج.م`;
const statusLabels: Record<SaleInvoiceStatus, string> = {
  draft: "مسودة",
  completed: "مكتملة",
  partially_returned: "مرتجع جزئي",
  fully_returned: "مرتجعة بالكامل",
  cancelled: "ملغاة",
};
const paymentLabels: Record<SalePaymentMethod, string> = {
  cash: "نقدي",
  card: "بطاقة",
  wallet: "محفظة إلكترونية",
  mixed: "دفع مختلط",
};
const returnLabels: Record<SaleReturnKind, string> = {
  full: "مرتجع كامل",
  partial: "مرتجع جزئي",
  exchange: "استبدال",
};

export function SaleInvoicePage({ invoiceId }: { invoiceId: string }) {
  const { roles, availableBranches } = useShell();
  const { invoices, returns } = useSales();
  const customers = useCustomers();
  const branches = useBranches();
  const employees = useEmployees();

  if (!canViewSales(roles)) return <PermissionDeniedState />;
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice || !canAccessSaleBranch(roles, invoice.branchId, availableBranches.map((item) => item.id))) {
    return <PermissionDeniedState />;
  }

  const customer = customers.find((item) => item.id === invoice.customerId);
  const branch = branches.find((item) => item.id === invoice.branchId);
  const employee = employees.find((item) => item.id === invoice.employeeId);
  const invoiceReturns = returns.filter((item) => item.invoiceId === invoice.id);

  return (
    <div className="sale-invoice-page">
      <Link className="sale-back" href="/sales/invoices"><ArrowRight size={16} />العودة إلى الفواتير</Link>
      <Card className="sale-receipt">
        <header>
          <div>
            <span>L3BTY · لعبتي</span>
            <h2>{invoice.invoiceNumber}</h2>
            <p>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(invoice.createdAt))}</p>
          </div>
          <Badge tone={invoice.status === "completed" ? "success" : "warning"}>{statusLabels[invoice.status]}</Badge>
        </header>

        <section className="sale-receipt__meta">
          <div><span>العميل</span><strong>{customer?.name ?? "عميل غير معروف"}</strong><small>{customer?.primaryPhone ?? "—"}</small></div>
          <div><span>الفرع</span><strong>{branch?.name ?? "فرع غير معروف"}</strong></div>
          <div><span>الموظف</span><strong>{employee?.name ?? "موظف غير معروف"}</strong></div>
        </section>

        <div className="sale-receipt__lines">
          <table>
            <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
            <tbody>{invoice.lines.map((line) => <tr key={line.id}><td>{line.name}</td><td>{line.quantity}</td><td>{money(line.unitPrice)}</td><td>{line.discountPercent}%</td><td>{money(line.lineTotal)}</td></tr>)}</tbody>
          </table>
        </div>

        <dl className="sale-receipt__totals">
          <div><dt>الإجمالي قبل الخصم</dt><dd>{money(invoice.subtotal)}</dd></div>
          <div><dt>خصومات المنتجات</dt><dd>{money(invoice.lineDiscountTotal)}</dd></div>
          <div><dt>خصم الفاتورة</dt><dd>{money(invoice.invoiceDiscountAmount)}</dd></div>
          <div><dt>الضريبة</dt><dd>{money(invoice.taxTotal)}</dd></div>
          <div><dt>الإجمالي</dt><dd>{money(invoice.totalAmount)}</dd></div>
          <div><dt>المدفوع</dt><dd>{money(invoice.paidAmount)}</dd></div>
          <div><dt>المتبقي</dt><dd>{money(invoice.remainingAmount)}</dd></div>
        </dl>

        <section className="sale-payments">
          <h3>المدفوعات</h3>
          {invoice.payments.map((payment) => <div key={payment.id}><span>{paymentLabels[payment.method]}{payment.reference ? ` · ${payment.reference}` : ""}</span><strong>{money(payment.amount)}</strong></div>)}
        </section>

        <footer>
          <Button icon={<Printer size={16} />} onClick={() => window.print()}>طباعة</Button>
          <select aria-label="مقاس الطباعة" defaultValue="80"><option value="58">58 مم</option><option value="80">80 مم</option><option value="a4">A4</option></select>
          {customer && branch ? <SaleWhatsAppAction invoice={invoice} customer={customer} branch={branch} /> : null}
          {customer ? <Link href={`/customers/${customer.id}`}>فتح ملف العميل</Link> : null}
          {["completed", "partially_returned"].includes(invoice.status) ? <Link className="ui-button ui-button--secondary ui-button--md" href={`/sales/returns?invoice=${invoice.id}`}>بدء مرتجع</Link> : null}
        </footer>
      </Card>

      {invoiceReturns.length ? <Card className="sale-return-history"><h3>المرتجعات والاستبدالات</h3>{invoiceReturns.map((item) => <div key={item.id}><strong>{item.returnNumber} · {returnLabels[item.kind]}</strong><span>{item.reason} · {money(item.refundAmount)}</span></div>)}</Card> : null}
      <Card className="sale-audit"><h3>سجل المراجعة</h3>{invoice.events.map((event) => <div key={event.id}><strong>{event.note}</strong><span>{employees.find((item) => item.id === event.by)?.name ?? "النظام"} · {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { timeStyle: "short" }).format(new Date(event.at))}</span></div>)}</Card>
    </div>
  );
}
