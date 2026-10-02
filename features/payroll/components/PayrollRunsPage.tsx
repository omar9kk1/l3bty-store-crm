"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { isPayrollAdmin } from "../permissions";
import { usePayroll } from "../hooks/use-payroll";
import { createPayrollRun, saveSalaryProfile } from "../services/payroll-store";
import { getCurrentPayrollPeriod, getTodayLocalDate } from "../services/payroll-period";
import type { SalaryType } from "../types";
import { formatMoney, payrollStatusLabels, payrollTone } from "./payroll-labels";

export function PayrollRunsPage() {
  const { roles } = useShell();
  const isOwner = roles.includes("owner");
  const data = usePayroll();
  const branches = useBranches();
  const employees = useEmployees().filter((item) => item.status === "active");
  const offline = useSearchParams().get("state") === "offline";
  const [message, setMessage] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [salaryType, setSalaryType] = useState<SalaryType>("monthly");
  const [baseSalary, setBaseSalary] = useState("");
  const [overtimeEnabled, setOvertimeEnabled] = useState(false);
  const [period, setPeriod] = useState(() => getCurrentPayrollPeriod("monthly"));
  if (!isPayrollAdmin(roles)) return <PermissionDeniedState />;
  const pendingApprovalRuns = isOwner ? data.runs.filter((run) => run.status === "pending_review") : [];

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = saveSalaryProfile({ employeeId: String(form.get("employeeId")), baseSalary: Number(form.get("baseSalary")).toFixed(2), salaryType: String(form.get("salaryType")) as SalaryType, effectiveFrom: getTodayLocalDate(), active: true, overtimeEnabled: form.get("overtimeEnabled") === "on", overtimeRateType: "normal", allowances: [], defaultDeductions: [], commissionsEnabled: false });
    setMessage(result.message);
  }
  function submitRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = createPayrollRun({ periodStart: String(form.get("periodStart")), periodEnd: String(form.get("periodEnd")), branchId: String(form.get("branchId")), actorEmployeeId: "employee-manager", employeeId });
    setMessage(result.message);
  }

  function selectEmployee(nextEmployeeId: string) {
    setEmployeeId(nextEmployeeId);
    const profile = data.profiles.find((item) => item.employeeId === nextEmployeeId && item.active);
    const nextType = profile?.salaryType ?? "monthly";
    setSalaryType(nextType);
    setBaseSalary(profile?.baseSalary ?? "");
    setOvertimeEnabled(profile?.overtimeEnabled ?? false);
    setPeriod(getCurrentPayrollPeriod(nextType));
  }

  return <div className="payroll-page">
    <header className="payroll-header"><div><span>الرواتب</span><h2>حساب الرواتب</h2><p>سجّل راتب كل موظف أولًا، ثم اختر الفترة المطلوبة واحسب الرواتب.</p></div></header>
    {pendingApprovalRuns.length ? <Card className="payroll-approval-alert"><div><strong>يوجد {pendingApprovalRuns.length.toLocaleString("ar-EG-u-nu-latn")} كشف راتب أرسله المدير وينتظر موافقتك</strong><span>راجع القيمة والتفاصيل ثم اعتمد الكشف ليصبح جاهزًا للدفع.</span></div><Link href={`/payroll/${pendingApprovalRuns[0].id}`}>مراجعة واعتماد الكشف</Link></Card> : null}
    {message ? <p className="payroll-feedback" role="status">{message}</p> : null}
    <Card className="payroll-setup-card">
      <h3>بيانات راتب الموظف</h3>
      <form className="payroll-run-form" onSubmit={submitProfile}>
        <label>الموظف<select name="employeeId" required value={employeeId} onChange={(event) => selectEmployee(event.target.value)}><option value="">اختر الموظف</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label>نوع الراتب<select name="salaryType" value={salaryType} onChange={(event) => { const next = event.target.value as SalaryType; setSalaryType(next); setPeriod(getCurrentPayrollPeriod(next)); }}><option value="monthly">شهري</option><option value="weekly">أسبوعي</option><option value="daily">يومي</option><option value="hourly">بالساعة</option></select></label>
        <label>قيمة الراتب<input type="number" name="baseSalary" min="0.01" step="0.01" required value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} /></label>
        <label className="payroll-checkbox"><input type="checkbox" name="overtimeEnabled" checked={overtimeEnabled} onChange={(event) => setOvertimeEnabled(event.target.checked)} /> <span>يُحسب الوقت الإضافي بعد اعتماده</span></label>
        <Button disabled={offline || !employees.length} variant="secondary">حفظ الراتب</Button>
      </form>
      <p className="payroll-profile-summary">{data.profiles.length} موظف مسجل له راتب من أصل {employees.length} موظف نشط.</p>
    </Card>
    <Card className="payroll-setup-card">
      <h3>تجهيز كشف راتب الفترة</h3>
      <p className="payroll-period-help">حدد البرنامج الفترة تلقائيًا حسب نوع الراتب. جهّز الكشف مرة واحدة، ثم افتحه للمراجعة والدفع.</p>
      <form className="payroll-run-form" onSubmit={submitRun}>
        <label>من يوم<input type="date" name="periodStart" required value={period.start} onChange={(event) => setPeriod({ ...period, start: event.target.value })} /></label>
        <label>إلى يوم<input type="date" name="periodEnd" required value={period.end} onChange={(event) => setPeriod({ ...period, end: event.target.value })} /></label>
        {branches.length > 1 ? <label>الفرع<select name="branchId"><option value="all">كل الفروع</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label> : <input type="hidden" name="branchId" value={branches[0]?.id ?? "all"} />}
        <Button disabled={offline || !employeeId || !data.profiles.some((profile) => profile.employeeId === employeeId && profile.active)} variant="primary">تجهيز كشف الراتب</Button>
      </form>
    </Card>
    <section className="payroll-run-grid">{data.runs.map((run) => <Link href={`/payroll/${run.id}`} key={run.id}><Card><header><strong>{run.payrollNumber}</strong><Badge tone={payrollTone(run.status)}>{payrollStatusLabels[run.status]}</Badge></header><p>{run.periodStart} — {run.periodEnd}</p><b>{formatMoney(run.netTotal)}</b><span className="payroll-run-review">مراجعة ودفع الراتب</span></Card></Link>)}</section>
  </div>;
}
