"use client";
import { type FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { usePayroll } from "../hooks/use-payroll";
import { requestAdvance } from "../services/payroll-store";
import { advanceStatusLabels, formatMoney } from "./payroll-labels";

export function MyPayrollPage() {
  const { roles } = useShell();
  const offline = useSearchParams().get("state") === "offline";
  const data = usePayroll();
  const employee = resolvePreviewEmployee(roles);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const publishedRuns = data.runs.filter((run) => ["approved", "partially_paid", "paid", "locked"].includes(run.status));
  const lines = publishedRuns.flatMap((run) => run.lines.map((line) => ({ run, line }))).filter((item) => item.line.employeeId === employee.id).sort((a, b) => b.run.periodEnd.localeCompare(a.run.periodEnd));
  const latest = lines[0];
  const advances = data.advances.filter((item) => item.employeeId === employee.id);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = requestAdvance({ employeeId: employee.id, branchId: employee.primaryBranchId, amount: String(form.get("amount")), installmentCount: Number(form.get("installments")), reason: String(form.get("reason")), employeeNote: String(form.get("note")), idempotencyKey: `advance-request-${employee.id}-${form.get("amount")}`, netSalary: latest?.line.netAmount });
    setMessage(result.message);
    if (result.valid) setOpen(false);
  }
  return <div className="payroll-page my-payroll-page">
    <header className="payroll-header"><div><span>مساحتي المالية</span><h2>كشف راتبي</h2><p>كشف {employee.name} فقط؛ لا تظهر ميزانية الرواتب أو خزينة الدفع.</p></div><div><Button onClick={() => window.print()}>طباعة Mock</Button><Button disabled={offline} variant="primary" onClick={() => setOpen(true)}>طلب سلفة</Button></div></header>
    {offline ? <div className="payroll-offline">وضع دون اتصال — الطلبات معطلة.</div> : null}
    {message ? <p className="payroll-feedback" role="status">{message}</p> : null}
    {latest ? <Card className="payslip"><header><div><span>آخر كشف منشور</span><h3>{latest.run.payrollNumber}</h3></div><Badge tone={latest.line.status === "paid" ? "success" : "info"}>{latest.line.status}</Badge></header><dl><div><dt>الأساسي</dt><dd>{formatMoney(latest.line.baseSalary)}</dd></div><div><dt>الوقت الإضافي المعتمد</dt><dd>{formatMoney(latest.line.overtimeAmount)}</dd></div><div><dt>البدلات</dt><dd>{formatMoney(String(latest.line.allowances.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)))}</dd></div><div><dt>الخصومات المعتمدة</dt><dd>{formatMoney(latest.line.totalDeductions)}</dd></div><div><dt>قسط السلفة</dt><dd>{formatMoney(latest.line.advancesDeducted)}</dd></div><div className="payslip-net"><dt>الصافي</dt><dd>{formatMoney(latest.line.netAmount)}</dd></div><div><dt>تاريخ الدفع</dt><dd>{latest.run.paidAt ?? "لم يدفع بعد"}</dd></div></dl></Card> : <Card className="payroll-empty">لا يوجد كشف راتب منشور للموظف الحالي.</Card>}
    <section><h3>الأشهر السابقة</h3><div className="payslip-history">{lines.slice(1).map((item) => <Card key={item.line.id}><strong>{item.run.periodStart.slice(0, 7)}</strong><span>{formatMoney(item.line.netAmount)}</span><Badge tone={item.line.status === "paid" ? "success" : "info"}>{item.line.status}</Badge></Card>)}</div></section>
    <section><h3>سلفي الحالية</h3><div className="advance-grid">{advances.map((item) => <Card key={item.id}><header><strong>{item.advanceNumber}</strong><Badge>{advanceStatusLabels[item.status]}</Badge></header><p>المتبقي {formatMoney(item.remainingAmount)}</p><p>القسط القادم {formatMoney(item.installmentAmount)}</p></Card>)}</div></section>
    <Drawer open={open} onOpenChange={setOpen} title="طلب سلفة" description="الطلب لا يعتمد تلقائيًا ولا يمكنك تغيير القسط بعد المراجعة." variant="auxiliary"><form className="payroll-form" onSubmit={submit}><label>المبلغ<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>عدد الأقساط<input name="installments" type="number" min="1" max="24" required /></label><label>السبب<textarea name="reason" minLength={5} required /></label><label>ملاحظة الموظف<textarea name="note" /></label><Button type="submit" variant="primary">إرسال الطلب</Button></form></Drawer>
  </div>;
}
