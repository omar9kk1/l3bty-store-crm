"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { canViewFinance } from "../permissions";
import { recordPayment } from "../services/finance-store";
import { useFinance } from "../hooks/use-finance";
import { money, paymentSourceLabels, receivableStatusLabels } from "./finance-labels";

export function ReceivablesPage() {
  const { roles } = useShell();
  const finance = useFinance();
  const customers = useCustomers();
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  if (!canViewFinance(roles)) return <PermissionDeniedState />;
  const customerMap = new Map(customers.map((item) => [item.id, item.name]));
  const receivable = finance.receivables.find((item) => item.id === selected);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivable) return;
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const cashboxId = String(data.get("cashboxId"));
    const result = recordPayment({ branchId: receivable.branchId, cashboxId, shiftId: null, customerId: receivable.customerId, sourceType: "receivable", sourceId: receivable.id, amount, parts: [{ method: "cash", amount, reference: "" }], employeeId: "employee-manager", roles, assignedBranchIds: [receivable.branchId], idempotencyKey: `receivable-${receivable.id}-${amount}`, administrativeReason: "سداد إداري لمديونية", maximumAmount: receivable.remainingAmount });
    setMessage(result.message);
    if (result.valid) setSelected(null);
  }
  return <div className="finance-page">
    <header className="finance-header"><div><span>المالية</span><h2>المديونيات والمبالغ المتبقية</h2><p>كل مديونية مرتبطة بمصدر واضح ولا يصبح رصيدها سالبًا.</p></div></header>
    {message ? <p className="finance-feedback" role="status">{message}</p> : null}
    <section className="receivable-grid">{finance.receivables.map((item) => <Card className="receivable-card" key={item.id}><header><strong>{customerMap.get(item.customerId) ?? item.customerId}</strong><Badge tone={item.status === "paid" ? "success" : item.status === "overdue" ? "danger" : "warning"}>{receivableStatusLabels[item.status]}</Badge></header><p>{paymentSourceLabels[item.sourceType]} · {item.sourceId}</p><dl><div><dt>الأصلي</dt><dd>{money(item.originalAmount)}</dd></div><div><dt>المدفوع</dt><dd>{money(item.paidAmount)}</dd></div><div><dt>المتبقي</dt><dd>{money(item.remainingAmount)}</dd></div></dl><div><Link href={item.sourceType === "sale" ? `/sales/invoices/${item.sourceId}` : item.sourceType === "rental" ? `/rentals/${item.sourceId}` : `/maintenance/orders/${item.sourceId}`}>فتح المستند الأصلي</Link>{item.remainingAmount > 0 ? <Button onClick={() => setSelected(item.id)}>تسجيل سداد</Button> : null}</div></Card>)}</section>
    <Drawer open={Boolean(receivable)} onOpenChange={(open) => !open && setSelected(null)} title="سداد مديونية" description="سداد جزئي أو كامل بحركة مالية مستقلة." variant="auxiliary">{receivable ? <form className="finance-form" onSubmit={submit}><p>المتبقي: <strong>{money(receivable.remainingAmount)}</strong></p><label>الخزينة<select name="cashboxId" required>{finance.cashboxes.filter((item) => item.branchId === receivable.branchId && item.status === "active" && item.type === "branch_cash").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>المبلغ<input name="amount" type="number" min="0.01" max={receivable.remainingAmount} step="0.01" required /></label><Button type="submit" variant="primary">تسجيل السداد</Button></form> : null}</Drawer>
  </div>;
}
