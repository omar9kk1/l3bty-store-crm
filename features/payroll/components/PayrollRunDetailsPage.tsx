"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useFinance } from "@/features/finance/hooks/use-finance";
import { isPayrollAdmin } from "../permissions";
import { usePayroll } from "../hooks/use-payroll";
import { payPayrollLine, transitionPayrollRun } from "../services/payroll-store";
import { formatMoney, payrollStatusLabels, payrollTone } from "./payroll-labels";

export function PayrollRunDetailsPage({ payrollId }: { payrollId: string }) {
  const { roles } = useShell();
  const offline = useSearchParams().get("state") === "offline";
  const data = usePayroll();
  const employees = useEmployees();
  const finance = useFinance();
  const [payLine, setPayLine] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  if (!isPayrollAdmin(roles)) return <PermissionDeniedState />;
  const run = data.runs.find((item) => item.id === payrollId);
  if (!run) return <PermissionDeniedState />;
  const names = new Map(employees.map((item) => [item.id, item.name]));
  const act = (action: "recalculate" | "submit" | "approve" | "lock" | "cancel") => {
    const result = transitionPayrollRun(payrollId, action, "employee-manager", `إجراء ${action} موثق على دورة الرواتب`);
    setMessage(result.message);
  };
  return <div className="payroll-page">
    <header className="payroll-header"><div><span>تفاصيل دورة الراتب</span><h2>{run.payrollNumber}</h2><p>{run.periodStart} — {run.periodEnd} · {run.branchId}</p></div><Badge tone={payrollTone(run.status)}>{payrollStatusLabels[run.status]}</Badge></header>
    {message ? <p className="payroll-feedback" role="status">{message}</p> : null}
    <section className="payroll-summary"><Card><span>الإجمالي</span><strong>{formatMoney(run.grossTotal)}</strong></Card><Card><span>الوقت الإضافي</span><strong>{formatMoney(run.overtimeTotal)}</strong></Card><Card><span>الخصومات</span><strong>{formatMoney(run.deductionsTotal)}</strong></Card><Card><span>السلف</span><strong>{formatMoney(run.advancesTotal)}</strong></Card><Card><span>الصافي</span><strong>{formatMoney(run.netTotal)}</strong></Card></section>
    <div className="payroll-actions"><Button disabled={offline || run.status === "locked"} onClick={() => act("recalculate")}>إعادة الحساب</Button><Button disabled={offline || run.status !== "draft"} onClick={() => act("submit")}>إرسال للموافقة</Button><Button disabled={offline || run.status !== "pending_review"} variant="primary" onClick={() => act("approve")}>اعتماد</Button><Button disabled={offline || !["paid", "partially_paid"].includes(run.status)} onClick={() => act("lock")}>قفل</Button><Button disabled={offline || run.status !== "draft"} variant="danger" onClick={() => act("cancel")}>إلغاء المسودة</Button></div>
    <Card className="payroll-list"><div className="payroll-table-wrap"><table><thead><tr><th>الموظف</th><th>الأساسي</th><th>الإضافي</th><th>الخصومات</th><th>السلفة</th><th>الصافي</th><th></th></tr></thead><tbody>{run.lines.map((line) => <tr key={line.id}><td>{names.get(line.employeeId)}</td><td>{formatMoney(line.baseSalary)}</td><td>{formatMoney(line.overtimeAmount)}</td><td>{formatMoney(line.totalDeductions)}</td><td>{formatMoney(line.advancesDeducted)}</td><td>{formatMoney(line.netAmount)}</td><td>{line.status === "paid" ? <Badge tone="success">مدفوع</Badge> : <Button disabled={offline || !["approved", "partially_paid"].includes(run.status)} size="sm" onClick={() => setPayLine(line.id)}>دفع</Button>}</td></tr>)}</tbody></table></div>
      <div className="payroll-mobile-list">{run.lines.map((line) => <Card className="payroll-employee-card" key={line.id}><header><strong>{names.get(line.employeeId)}</strong><Badge tone={line.status === "paid" ? "success" : "warning"}>{line.status}</Badge></header><dl><div><dt>الأساسي</dt><dd>{formatMoney(line.baseSalary)}</dd></div><div><dt>الإضافي</dt><dd>{formatMoney(line.overtimeAmount)}</dd></div><div><dt>الخصومات</dt><dd>{formatMoney(line.totalDeductions)}</dd></div><div><dt>الصافي</dt><dd>{formatMoney(line.netAmount)}</dd></div></dl>{line.status !== "paid" ? <Button disabled={offline || !["approved", "partially_paid"].includes(run.status)} onClick={() => setPayLine(line.id)}>دفع Mock</Button> : null}</Card>)}</div>
    </Card>
    <Card className="payroll-timeline"><h3>Timeline وAudit Mock</h3>{run.timeline.map((item) => <p key={item.id}><strong>{item.action}</strong> · {item.reason} · {item.at}</p>)}</Card>
    <Drawer open={!!payLine} onOpenChange={(open) => !open && setPayLine(null)} title="دفع راتب Mock" description="لا يوجد Bank API؛ الحركة تسجل مرة واحدة فقط." variant="auxiliary"><div className="payroll-form"><label>خزينة الدفع<select id="payroll-cashbox">{finance.cashboxes.filter((item) => item.status === "active").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><Button variant="primary" onClick={() => { if (!payLine) return; const result = payPayrollLine(run.id, payLine, (document.getElementById("payroll-cashbox") as HTMLSelectElement).value, "employee-manager"); setMessage(result.message); if (result.valid) setPayLine(null); }}>تأكيد الدفع</Button></div></Drawer>
  </div>;
}
