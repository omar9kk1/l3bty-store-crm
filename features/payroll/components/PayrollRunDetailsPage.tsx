"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useFinance } from "@/features/finance/hooks/use-finance";
import { isPayrollAdmin } from "../permissions";
import { usePayroll } from "../hooks/use-payroll";
import { payPayrollLine, transitionPayrollRun } from "../services/payroll-store";
import { formatMoney, payrollLineStatusLabels, payrollStatusLabels, payrollTone } from "./payroll-labels";

const payrollEventLabels: Readonly<Record<string, string>> = {
  created: "تم إنشاء كشف الراتب",
  submit: "أرسل المدير الكشف للمالك",
  approve: "اعتمد المالك الكشف",
  line_paid: "تم دفع راتب الموظف",
  lock: "تم قفل الكشف",
  cancel: "تم إلغاء الكشف",
};
const payrollActorLabels: Readonly<Record<string, string>> = { "employee-owner": "المالك", "employee-manager": "المدير" };
function formatPayrollEventDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

export function PayrollRunDetailsPage({ payrollId }: { payrollId: string }) {
  const { roles } = useShell();
  const isOwner = roles.includes("owner");
  const offline = useSearchParams().get("state") === "offline";
  const data = usePayroll();
  const employees = useEmployees();
  const branches = useBranches();
  const finance = useFinance();
  const [payLine, setPayLine] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  if (!isPayrollAdmin(roles)) return <PermissionDeniedState />;
  const run = data.runs.find((item) => item.id === payrollId);
  if (!run) return <PermissionDeniedState />;
  const names = new Map(employees.map((item) => [item.id, item.name]));
  const branchName = run.branchId === "all" ? "كل الفروع" : branches.find((item) => item.id === run.branchId)?.name ?? "فرع غير معروف";
  const visibleTimeline = run.timeline.filter((item) => payrollEventLabels[item.action]).slice().reverse();
  const act = (action: "recalculate" | "submit" | "approve" | "lock" | "cancel") => {
    const result = transitionPayrollRun(payrollId, action, isOwner ? "employee-owner" : "employee-manager", `إجراء ${action} موثق على حساب الرواتب`, isOwner ? "owner" : "manager");
    setMessage(result.message);
  };
  return <div className="payroll-page">
    <header className="payroll-header payroll-run-header"><div><span>تفاصيل حساب الرواتب</span><h2>{run.payrollNumber}</h2><p>{run.periodStart} — {run.periodEnd} · {branchName}</p></div><Badge tone={payrollTone(run.status)}>{payrollStatusLabels[run.status]}</Badge></header>
    {message ? <p className="payroll-feedback" role="status">{message}</p> : null}
    <div className="payroll-actions payroll-run-actions">
      {run.status === "draft" ? <><Button disabled={offline} onClick={() => act("recalculate")}>إعادة الحساب</Button>{isOwner ? <Button disabled={offline} variant="primary" onClick={() => act("approve")}>اعتماد كشف الراتب</Button> : <Button disabled={offline} variant="primary" onClick={() => act("submit")}>إرسال للمالك للموافقة</Button>}<Button disabled={offline} variant="danger" onClick={() => act("cancel")}>إلغاء المسودة</Button></> : null}
      {run.status === "pending_review" && isOwner ? <Button disabled={offline} variant="primary" onClick={() => act("approve")}>اعتماد كشف الراتب</Button> : null}
      {run.status === "pending_review" && !isOwner ? <p className="payroll-action-state">تم إرسال كشف الراتب للمالك — بانتظار الموافقة.</p> : null}
      {run.status === "approved" ? <p className="payroll-action-state">اعتمد المالك كشف الراتب — يمكنك دفع راتب الموظف من الجدول.</p> : null}
      {run.status === "partially_paid" ? <p className="payroll-action-state">تم دفع جزء من الكشف — أكمل دفع الرواتب المتبقية.</p> : null}
      {run.status === "paid" ? <Button disabled={offline} variant="primary" onClick={() => act("lock")}>قفل الكشف بعد اكتمال الدفع</Button> : null}
      {run.status === "locked" ? <p className="payroll-action-state">تم دفع جميع الرواتب وقفل الكشف نهائيًا.</p> : null}
      {run.status === "cancelled" ? <p className="payroll-action-state">تم إلغاء هذا الكشف.</p> : null}
    </div>
    <section className="payroll-summary"><Card><span>الإجمالي</span><strong>{formatMoney(run.grossTotal)}</strong></Card><Card><span>الوقت الإضافي</span><strong>{formatMoney(run.overtimeTotal)}</strong></Card><Card><span>الخصومات</span><strong>{formatMoney(run.deductionsTotal)}</strong></Card><Card><span>السلف</span><strong>{formatMoney(run.advancesTotal)}</strong></Card><Card><span>الصافي</span><strong>{formatMoney(run.netTotal)}</strong></Card></section>
    <Card className="payroll-list"><div className="payroll-table-wrap"><table><thead><tr><th>الموظف</th><th>الأساسي</th><th>الإضافي</th><th>الخصومات</th><th>السلفة</th><th>الصافي</th><th></th></tr></thead><tbody>{run.lines.map((line) => <tr key={line.id}><td>{names.get(line.employeeId)}</td><td>{formatMoney(line.baseSalary)}</td><td>{formatMoney(line.overtimeAmount)}</td><td>{formatMoney(line.totalDeductions)}</td><td>{formatMoney(line.advancesDeducted)}</td><td>{formatMoney(line.netAmount)}</td><td>{line.status === "paid" ? <Badge tone="success">مدفوع</Badge> : ["approved", "partially_paid"].includes(run.status) ? <Button disabled={offline} size="sm" onClick={() => setPayLine(line.id)}>دفع الراتب</Button> : <span>الدفع بعد الاعتماد</span>}</td></tr>)}</tbody></table></div>
      <div className="payroll-mobile-list">{run.lines.map((line) => <Card className="payroll-employee-card" key={line.id}><header><strong>{names.get(line.employeeId)}</strong><Badge tone={line.status === "paid" ? "success" : "warning"}>{payrollLineStatusLabels[line.status]}</Badge></header><dl><div><dt>الأساسي</dt><dd>{formatMoney(line.baseSalary)}</dd></div><div><dt>الإضافي</dt><dd>{formatMoney(line.overtimeAmount)}</dd></div><div><dt>الخصومات</dt><dd>{formatMoney(line.totalDeductions)}</dd></div><div><dt>الصافي</dt><dd>{formatMoney(line.netAmount)}</dd></div></dl>{line.status === "paid" ? null : ["approved", "partially_paid"].includes(run.status) ? <Button disabled={offline} onClick={() => setPayLine(line.id)}>دفع الراتب</Button> : <span>الدفع بعد الاعتماد</span>}</Card>)}</div>
    </Card>
    {visibleTimeline.length ? <Card className="payroll-timeline"><h3>سجل حالة الكشف</h3><ol>{visibleTimeline.map((item) => <li key={item.id}><span><strong>{payrollEventLabels[item.action]}</strong><small>بواسطة {payrollActorLabels[item.actorEmployeeId] ?? names.get(item.actorEmployeeId) ?? "المستخدم"}</small></span><time dateTime={item.at}>{formatPayrollEventDate(item.at)}</time></li>)}</ol></Card> : null}
    <Drawer open={!!payLine} onOpenChange={(open) => !open && setPayLine(null)} title="دفع الراتب" description="تُسجل حركة الدفع مرة واحدة فقط في الخزينة المختارة." variant="auxiliary"><div className="payroll-form"><label>خزينة الدفع<select id="payroll-cashbox">{finance.cashboxes.filter((item) => item.status === "active").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><Button variant="primary" onClick={() => { if (!payLine) return; const result = payPayrollLine(run.id, payLine, (document.getElementById("payroll-cashbox") as HTMLSelectElement).value, isOwner ? "employee-owner" : "employee-manager"); setMessage(result.message); if (result.valid) setPayLine(null); }}>تأكيد الدفع</Button></div></Drawer>
  </div>;
}
