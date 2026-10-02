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
import { payAdvance, reviewAdvance } from "../services/payroll-store";
import { advanceStatusLabels, formatMoney } from "./payroll-labels";

export function AdvancesPage() {
  const { roles, availableBranches } = useShell();
  const offline = useSearchParams().get("state") === "offline";
  const data = usePayroll();
  const employees = useEmployees();
  const finance = useFinance();
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (!isPayrollAdmin(roles)) return <PermissionDeniedState />;

  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name]));
  const branchNames = new Map(availableBranches.map((branch) => [branch.id, branch.nameAr]));
  const item = data.advances.find((advance) => advance.id === selected);
  const pending = data.advances.filter((advance) => advance.status === "pending");
  const readyToPay = data.advances.filter((advance) => advance.status === "approved");
  const active = data.advances.filter((advance) => advance.status === "active_repayment");
  const totalRemaining = active.reduce((sum, advance) => sum + Number(advance.remainingAmount), 0);
  const actor = roles.includes("owner") ? "employee-owner" : "employee-manager";
  const cashboxes = item ? finance.cashboxes.filter((cashbox) => cashbox.status === "active" && cashbox.branchId === item.branchId) : [];

  function review(decision: "approved" | "rejected") {
    if (!item) return;
    const amount = (document.getElementById("advance-amount") as HTMLInputElement).value;
    const installments = Number((document.getElementById("advance-installments") as HTMLInputElement).value);
    const note = (document.getElementById("advance-note") as HTMLTextAreaElement).value;
    const result = reviewAdvance(item.id, actor, decision, decision === "approved" ? amount : "0", decision === "approved" ? installments : 1, note);
    setMessage(result.message);
    if (result.valid) setSelected(null);
  }

  function pay() {
    if (!item || !cashboxes.length) return;
    const result = payAdvance(item.id, (document.getElementById("advance-cashbox") as HTMLSelectElement).value, actor);
    setMessage(result.message);
    if (result.valid) setSelected(null);
  }

  return <div className="payroll-page advances-page">
    <header className="payroll-header">
      <div>
        <span>الرواتب</span>
        <h2>السلف</h2>
        <p>راجع طلبات الموظفين وتابع الأقساط المتبقية.</p>
      </div>
    </header>

    {offline ? <p className="payroll-offline">أنت غير متصل الآن — يمكنك العرض فقط.</p> : null}
    {message ? <p className="payroll-feedback" role="status">{message}</p> : null}

    {!data.advances.length ? <Card className="advance-empty">
      <div className="advance-empty__icon" aria-hidden>✓</div>
      <h3>لا توجد طلبات سلف حاليًا</h3>
      <p>عندما يطلب أحد الموظفين سلفة ستظهر هنا للمراجعة.</p>
    </Card> : <>
      <section className="advance-summary">
        <Card><span>تنتظر المراجعة</span><strong>{pending.length}</strong></Card>
        <Card><span>جاهزة للدفع</span><strong>{readyToPay.length}</strong></Card>
        <Card><span>جارٍ سدادها</span><strong>{active.length}</strong><small>متبقي {formatMoney(String(totalRemaining))}</small></Card>
      </section>

      <section className="advance-grid">
        {data.advances.map((advance) => <button key={advance.id} onClick={() => setSelected(advance.id)}>
          <Card className="advance-card">
            <header><strong>{employeeNames.get(advance.employeeId) ?? "موظف"}</strong><Badge tone={advance.status === "pending" ? "warning" : advance.status === "completed" ? "success" : "info"}>{advanceStatusLabels[advance.status]}</Badge></header>
            <b>{formatMoney(advance.requestedAmount)}</b>
            <p>{advance.reason}</p>
            <footer><small>{advance.advanceNumber}</small><small>{branchNames.get(advance.branchId) ?? "فرع غير معروف"}</small></footer>
          </Card>
        </button>)}
      </section>
    </>}

    <Drawer open={!!item} onOpenChange={(open) => !open && setSelected(null)} title={item ? `سلفة ${employeeNames.get(item.employeeId) ?? "الموظف"}` : "مراجعة السلفة"} description="راجع المبلغ والأقساط قبل اتخاذ القرار." variant="auxiliary">
      {item ? <div className="payroll-form advance-review-form">
        <div className="advance-request-summary">
          <span>المبلغ المطلوب</span><strong>{formatMoney(item.requestedAmount)}</strong>
          <span>سبب السلفة</span><p>{item.reason}</p>
        </div>

        {item.status === "pending" ? <>
          <div className="advance-form-grid">
            <label>المبلغ المعتمد<input id="advance-amount" defaultValue={item.requestedAmount} type="number" min="0.01" step="0.01" /></label>
            <label>عدد الأقساط<input id="advance-installments" defaultValue={item.installmentCount} type="number" min="1" /></label>
          </div>
          <label>ملاحظة المراجعة<textarea id="advance-note" defaultValue="تمت مراجعة طلب السلفة" /></label>
          <div className="payroll-actions">
            <Button disabled={offline} variant="primary" onClick={() => review("approved")}>اعتماد السلفة</Button>
            <Button disabled={offline} variant="danger" onClick={() => review("rejected")}>رفض</Button>
          </div>
        </> : null}

        {item.status === "approved" ? <>
          {cashboxes.length ? <label>الدفع من خزنة<select id="advance-cashbox">{cashboxes.map((cashbox) => <option value={cashbox.id} key={cashbox.id}>{cashbox.name}</option>)}</select></label> : <p className="advance-no-cashbox">لا توجد خزنة نشطة لهذا الفرع.</p>}
          <Button disabled={offline || !cashboxes.length} variant="primary" onClick={pay}>تأكيد دفع السلفة</Button>
        </> : null}

        {item.status === "active_repayment" ? <div className="advance-repayment">
          <div><span>القسط</span><strong>{formatMoney(item.installmentAmount)}</strong></div>
          <div><span>المتبقي</span><strong>{formatMoney(item.remainingAmount)}</strong></div>
          <div><span>الأقساط المدفوعة</span><strong>{item.installmentsPaid} من {item.installmentCount}</strong></div>
        </div> : null}
      </div> : null}
    </Drawer>
  </div>;
}
