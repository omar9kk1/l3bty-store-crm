"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CircleDollarSign, Pencil, ReceiptText, Wrench, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { CustomerForm } from "../forms/CustomerForm";
import { useCustomers } from "../hooks/use-customers";
import { resolveCustomerAccess } from "../permissions";
import { updateCustomer } from "../services/customer-store";
import { scopeCustomers } from "../services/query-customers";
import { CUSTOMER_ACTIVITY_FIXTURES } from "../fixtures";
import type { CustomerFormValues } from "../types";
import { CustomerActivityTimeline } from "./CustomerActivityTimeline";
import { CustomerContactCard } from "./CustomerContactCard";
import { CustomerFlags } from "./CustomerFlags";
import { CustomerOverview } from "./CustomerOverview";
import { CustomerSalesSummary } from "@/features/sales/components/CustomerSalesSummary";

const statusLabels = { active: "نشط", inactive: "غير نشط", blocked: "موقوف" } as const;
const statusTones = { active: "success", inactive: "neutral", blocked: "danger" } as const;

function SectionCard({ eyebrow, title, icon: Icon, rows }: { eyebrow: string; title: string; icon: LucideIcon; rows: { label: string; value: string }[] }) {
  return <Card className="customer-detail-card"><div className="customer-detail-card__heading"><div><span>{eyebrow}</span><h3>{title}</h3></div><Icon aria-hidden size={20} /></div><dl className="customer-detail-list">{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></Card>;
}

export function CustomerDetailsPage({ customerId }: { customerId: string }) {
  const customers = useCustomers();
  const { roles, activeBranch, availableBranches } = useShell();
  const access = useMemo(() => resolveCustomerAccess(roles), [roles]);
  const scoped = useMemo(() => scopeCustomers(customers, roles, activeBranch.id, availableBranches.map((branch) => branch.id)), [activeBranch.id, availableBranches, customers, roles]);
  const customer = scoped.find((item) => item.id === customerId);
  const [editOpen, setEditOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const branchNames = Object.fromEntries(availableBranches.map((branch) => [branch.id, branch.nameAr]));

  if (!customer) return <Card className="customers-state"><h2>ملف العميل غير متاح</h2><p>قد يكون خارج نطاق دورك أو الفرع الحالي، أو أن المعرّف غير موجود.</p><Link className="ui-button ui-button--primary ui-button--md" href="/customers">العودة إلى العملاء</Link></Card>;
  const resolvedCustomer = customer;

  const events = CUSTOMER_ACTIVITY_FIXTURES
    .filter((event) => event.customerId === customer.id)
    .filter((event) => access.canViewFullTimeline || (event.type !== "profile" && access.allowedActivityTypes.includes(event.type)))
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt));

  function save(values: CustomerFormValues) {
    updateCustomer(resolvedCustomer.id, values);
    setEditOpen(false);
    setNotice("تم تحديث بيانات العميل في الحالة التجريبية.");
  }

  return (
    <div className="customer-details-page">
      <Link href="/customers" className="customer-back-link"><ArrowRight aria-hidden size={16} />العودة إلى العملاء</Link>
      <Card className="customer-profile-header">
        <div className="customer-profile-header__main"><div><span className="customers-eyebrow">ملف العميل · {customer.customerNumber}</span><h2>{customer.name}</h2><a className="customer-phone" href={`tel:${customer.primaryPhone}`}>{customer.primaryPhone}</a></div><div className="customer-profile-header__badges"><Badge tone={statusTones[customer.status]}>{statusLabels[customer.status]}</Badge><CustomerFlags flags={customer.flags.filter((flag) => access.canViewFinancial || flag === "needs_review")} compact /></div></div>
        <div className="customer-profile-header__meta"><span>الفروع: {customer.branchIds.map((id) => branchNames[id] ?? id).join("، ")}</span><span>أُنشئ: {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(customer.createdAt))}</span><span>آخر نشاط: {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(customer.lastActivityAt))}</span></div>
        {access.canEdit ? <Button type="button" icon={<Pencil aria-hidden size={16} />} onClick={() => setEditOpen(true)}>تعديل البيانات</Button> : null}
      </Card>
      {notice ? <div className="customers-notice" role="status">{notice}</div> : null}
      <CustomerOverview customer={customer} access={access} />
      <div className="customer-details-grid">
        <CustomerContactCard customer={customer} onCopy={async (phone) => { await navigator.clipboard?.writeText(phone); setNotice("تم نسخ رقم الهاتف."); }} />
        {access.canViewFinancial ? <SectionCard eyebrow="ملخص مالي" title="الأرصدة الإجمالية" icon={CircleDollarSign} rows={[{ label: "إجمالي المشتريات", value: `${customer.totalSales.toLocaleString("ar-EG-u-nu-latn")} ج.م` }, { label: "إجمالي التأجير", value: `${customer.totalRentals.toLocaleString("ar-EG-u-nu-latn")} ج.م` }, { label: "أوامر الصيانة", value: customer.totalMaintenanceOrders.toLocaleString("ar-EG-u-nu-latn") }, { label: "المبلغ المتبقي", value: `${customer.outstandingBalance.toLocaleString("ar-EG-u-nu-latn")} ج.م` }]} /> : null}
        {access.canViewSales ? <SectionCard eyebrow="المبيعات" title="ملخص مشتريات العميل" icon={ReceiptText} rows={[{ label: "إجمالي المشتريات", value: `${customer.totalSales.toLocaleString("ar-EG-u-nu-latn")} ج.م` }, { label: "آخر مرجع تجريبي", value: events.find((event) => event.type === "sales")?.reference ?? "لا توجد عمليات" }]} /> : null}
        {access.canViewRentals ? <SectionCard eyebrow="التأجير" title="ملخص عمليات التأجير" icon={CalendarClock} rows={[{ label: "إجمالي التأجير", value: `${customer.totalRentals.toLocaleString("ar-EG-u-nu-latn")} ج.م` }, { label: "الحالة", value: customer.totalRentals ? "بيانات تجريبية متاحة" : "لا توجد عمليات" }]} /> : null}
        {access.canViewMaintenance ? <SectionCard eyebrow="الصيانة" title="أوامر الصيانة" icon={Wrench} rows={[{ label: "عدد الأوامر", value: customer.totalMaintenanceOrders.toLocaleString("ar-EG-u-nu-latn") }, { label: "آخر مرجع مسند", value: events.find((event) => event.type === "maintenance")?.reference ?? "لا توجد أوامر متاحة" }]} /> : null}
      </div>
      {access.canViewSales ? <CustomerSalesSummary customerId={customer.id} /> : null}
      <CustomerActivityTimeline events={events} />
      <Drawer open={editOpen} onOpenChange={setEditOpen} title="تعديل العميل" description="تحديث البيانات الأساسية داخل الحالة التجريبية." variant="auxiliary"><CustomerForm customers={customers} branches={availableBranches} initialCustomer={customer} onCancel={() => setEditOpen(false)} onSave={save} /></Drawer>
    </div>
  );
}
