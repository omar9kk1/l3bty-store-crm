"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import type { BranchOption } from "@/features/branches/types";
import { money } from "@/features/finance/components/finance-labels";
import { useFinance } from "@/features/finance/hooks/use-finance";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { useShifts } from "../hooks/use-shifts";
import { canUseFinancialShift, currentMockEmployeeId, isShiftAdmin } from "../permissions";
import { closeShift, getShiftClosingTotals, openShift } from "../services/shift-store";
import { shiftStatusLabels, shiftTone } from "./shift-labels";

export function formatShiftDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

export function getShiftDateTimeParts(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "short", timeZone: "Africa/Cairo" }).format(date),
    time: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { timeStyle: "short", timeZone: "Africa/Cairo" }).format(date),
  };
}

export function getShortShiftNumber(value: string) {
  const trailingDigits = value.match(/\d+$/)?.[0];
  return trailingDigits ? trailingDigits.slice(-4) : value.slice(-4);
}

function ShiftDateTime({ value }: { value: string | null }) {
  const parts = getShiftDateTimeParts(value);
  if (!parts) return <span className="shift-date-time shift-date-time--empty">—</span>;
  return <time className="shift-date-time" dateTime={value ?? undefined}><span>{parts.date}</span><strong>{parts.time}</strong></time>;
}

export function getCashDifference(expectedCash: number, countedCash: string) {
  if (!countedCash.trim()) return null;
  const counted = Number(countedCash);
  if (!Number.isFinite(counted)) return null;
  const amount = counted - expectedCash;
  if (Math.abs(amount) <= .01) return { amount: 0, type: "matched" as const };
  return { amount, type: amount < 0 ? "shortage" as const : "surplus" as const };
}

export function filterShiftsByBranch<T extends { branchId: string }>(items: readonly T[], branchId: string) {
  return branchId === "all" ? items : items.filter((item) => item.branchId === branchId);
}

export function getFinancialShiftBranches(branches: readonly BranchOption[]) {
  return branches.filter((item) => item.id !== "all" && item.type !== "central_workshop");
}

export function ShiftsPage() {
  const { roles, activeEmployee, availableBranches } = useShell();
  const { shifts } = useShifts();
  const finance = useFinance();
  const employees = useEmployees();
  const [panel, setPanel] = useState<"open" | "close" | null>(null);
  const [message, setMessage] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  if (!canUseFinancialShift(roles)) return <PermissionDeniedState />;

  const admin = isShiftAdmin(roles);
  const employeeId = activeEmployee?.id ?? currentMockEmployeeId(roles);
  const shiftBranches = getFinancialShiftBranches(availableBranches);
  const shiftBranchIds = new Set(shiftBranches.map((item) => item.id));
  const roleVisible = (admin ? shifts : shifts.filter((item) => item.employeeId === employeeId))
    .filter((item) => shiftBranchIds.has(item.branchId));
  const visible = filterShiftsByBranch(roleVisible, admin ? branchFilter : "all");
  const current = admin ? undefined : visible.find((item) => item.status === "open");
  const employeeMap = new Map(employees.map((item) => [item.id, item]));
  const branchMap = new Map(shiftBranches.map((item) => [item.id, item.nameAr]));
  const cashboxMap = new Map(finance.cashboxes.map((item) => [item.id, item.name]));
  const employeeName = (id: string) => employeeMap.get(id)?.name ?? (id === employeeId ? activeEmployee?.name : undefined) ?? "موظف غير متاح";
  const employeeRole = (id: string) => {
    const employee = employeeMap.get(id);
    const roleLabels = employee?.roleAssignments
      .filter((item) => item.active)
      .map((item) => ROLE_TEMPLATES[item.roleKey]?.labelAr)
      .filter((label): label is string => Boolean(label)) ?? [];
    return roleLabels.length ? roleLabels.join("، ") : employee?.jobTitle || "الدور غير محدد";
  };
  const branchName = (id: string) => branchMap.get(id) ?? "فرع غير متاح";
  const cashboxName = (id: string) => cashboxMap.get(id) ?? "خزنة الفرع";

  function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = openShift({ employeeId, branchId: String(data.get("branchId")), cashboxId: String(data.get("cashboxId")), openingBalance: Number(data.get("openingBalance")), openingNote: String(data.get("openingNote")), assignedBranchIds: shiftBranches.map((item) => item.id), idempotencyKey: `open-${employeeId}-${data.get("cashboxId")}` });
    setMessage(result.message);
    if (result.valid) setPanel(null);
  }

  function close(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const data = new FormData(event.currentTarget);
    const totals = getShiftClosingTotals(current.id);
    if (!totals) return;
    const result = closeShift({ shiftId: current.id, employeeId, countedCash: Number(data.get("countedCash")), countedCard: totals.expectedCard, countedWallet: totals.expectedWallet, closingNote: "", differenceReason: String(data.get("differenceReason")), idempotencyKey: `close-${current.id}` });
    setMessage(result.message);
    if (result.valid) { setCountedCash(""); setPanel(null); }
  }

  const currentCollections = current ? finance.payments.filter((item) => item.shiftId === current.id && item.direction === "incoming").reduce((sum, item) => sum + item.amount, 0) : 0;
  const availableCashboxes = finance.cashboxes.filter((item) => item.status === "active" && shiftBranchIds.has(item.branchId) && item.assignedEmployeeIds.includes(employeeId));
  const closingTotals = current ? getShiftClosingTotals(current.id) : null;
  const cashDifference = closingTotals ? getCashDifference(closingTotals.expectedCash, countedCash) : null;
  const hasCashDifference = cashDifference !== null && cashDifference.type !== "matched";

  return <div className="shifts-page">
    <header className="shifts-header">
      <div><span>الخزنة اليومية</span><h2>{admin ? "متابعة فتح وإغلاق الخزنة" : "فتح وإغلاق الخزنة"}</h2><p>{admin ? "تابع الخزائن المفتوحة وتحصيل كل موظف والفروقات التي تحتاج مراجعة." : "افتح الخزنة عند بداية عملك، وأغلقها بعد تسجيل المبلغ الموجود فعليًا."}</p></div>
      {!admin ? <div>{current ? <Button variant="danger" onClick={() => setPanel("close")}>إغلاق الخزنة وإنهاء الوردية</Button> : <Button variant="primary" onClick={() => setPanel("open")}>فتح الخزنة وبدء الوردية</Button>}</div> : null}
    </header>
    {message ? <p className="shift-feedback" role="status">{message}</p> : null}

    {current ? <Card className="current-shift-card">
      <header><div><span>الوردية المفتوحة الآن</span><h3 dir="ltr">{current.shiftNumber}</h3></div><Badge tone="success">مفتوحة</Badge></header>
      <div><p>الخزنة <strong>{cashboxName(current.cashboxId)}</strong></p><p>رصيد بداية الوردية <strong>{money(current.openingBalance)}</strong></p><p>التحصيل حتى الآن <strong>{money(currentCollections)}</strong></p></div>
      <Link href={`/shifts/${current.id}`}>عرض التحصيل والتفاصيل</Link>
    </Card> : !admin ? <Card className="shift-state"><h3>لا توجد خزنة مفتوحة الآن</h3><p>ابدأ بفتح خزنة الفرع قبل تسجيل أي تحصيل.</p></Card> : null}

    {admin ? <Card className="shift-branch-filter">
      <label htmlFor="shift-branch-filter">الفرع</label>
      <select id="shift-branch-filter" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
        <option value="all">كل الفروع</option>
        {shiftBranches.map((item) => <option value={item.id} key={item.id}>{item.nameAr}</option>)}
      </select>
    </Card> : null}

    <section className="shift-summary" aria-label="ملخص الخزائن والورديات"><Card><span>خزائن مفتوحة الآن</span><strong>{visible.filter((item) => item.status === "open").length}</strong></Card><Card><span>فروقات تحتاج مراجعة</span><strong>{visible.filter((item) => item.status === "closing_review").length}</strong></Card><Card><span>ورديات مغلقة</span><strong>{visible.filter((item) => ["closed", "force_closed"].includes(item.status)).length}</strong></Card></section>

    {visible.length ? <Card className="shift-list">
      <div className="shift-table-wrap"><table><thead><tr><th>رقم الوردية</th><th>الموظف</th><th>الفرع</th><th>الخزنة</th><th>وقت الفتح</th><th>وقت الإغلاق</th><th>التحصيل</th><th>الحالة</th><th></th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td className="shift-number" dir="ltr" title={item.shiftNumber}>{getShortShiftNumber(item.shiftNumber)}</td><td><span className="shift-employee"><strong>{employeeName(item.employeeId)}</strong><small>{employeeRole(item.employeeId)}</small></span></td><td>{branchName(item.branchId)}</td><td>{cashboxName(item.cashboxId)}</td><td><ShiftDateTime value={item.openedAt} /></td><td><ShiftDateTime value={item.closedAt} /></td><td className="shift-money">{money(item.totalCollections)}</td><td><Badge tone={shiftTone(item.status)}>{shiftStatusLabels[item.status]}</Badge></td><td className="shift-actions"><Link href={`/shifts/${item.id}`}>التفاصيل</Link></td></tr>)}</tbody></table></div>
      <div className="shift-mobile-list">{visible.map((item) => <Link href={`/shifts/${item.id}`} className="shift-mobile-card" key={item.id}><header><strong dir="ltr" title={item.shiftNumber}>{getShortShiftNumber(item.shiftNumber)}</strong><Badge tone={shiftTone(item.status)}>{shiftStatusLabels[item.status]}</Badge></header><div className="shift-employee shift-employee--mobile"><h3>{employeeName(item.employeeId)}</h3><small>{employeeRole(item.employeeId)}</small></div><p>{branchName(item.branchId)} · {cashboxName(item.cashboxId)}</p><div className="shift-mobile-times"><span><small>وقت الفتح</small><ShiftDateTime value={item.openedAt} /></span><span><small>وقت الإغلاق</small><ShiftDateTime value={item.closedAt} /></span></div><strong>التحصيل: {money(item.totalCollections)}</strong></Link>)}</div>
    </Card> : <Card className="shift-empty"><h3>لا توجد ورديات خزنة حتى الآن</h3><p>{admin ? "عندما يفتح أحد الموظفين خزنته ستظهر هنا مع التحصيل وحالة الإغلاق." : "افتح الخزنة لبدء أول وردية لك."}</p></Card>}

    <Drawer open={panel === "open"} onOpenChange={(value) => setPanel(value ? "open" : null)} title="فتح الخزنة وبدء الوردية" description="سجّل المبلغ الموجود في الخزنة قبل بدء التحصيل." variant="auxiliary"><form className="shift-form" onSubmit={open}><label>الفرع<select name="branchId" required>{shiftBranches.map((item) => <option value={item.id} key={item.id}>{item.nameAr}</option>)}</select></label><label>الخزنة<select name="cashboxId" required>{availableCashboxes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>المبلغ الموجود عند البداية<input name="openingBalance" type="number" min="0" step="0.01" required /></label><label>ملاحظة اختيارية<textarea name="openingNote" /></label><Button type="submit" variant="primary" disabled={!availableCashboxes.length}>فتح الخزنة</Button>{!availableCashboxes.length ? <p>لا توجد خزنة متاحة لهذا الموظف في الفرع المختار.</p> : null}</form></Drawer>

    <Drawer open={panel === "close"} onOpenChange={(value) => { setPanel(value ? "close" : null); if (!value) setCountedCash(""); }} title="إغلاق الخزنة وإنهاء الوردية" description="اكتب النقدي الموجود فعليًا، وسيظهر الفرق قبل إغلاق الخزنة." variant="auxiliary"><form className="shift-form" onSubmit={close}>
      <div className="shift-close-summary" aria-label="ملخص إغلاق الخزنة">
        <span>المبلغ المتوقع حسب البرنامج</span><strong>{money(closingTotals?.expectedCash ?? 0)}</strong>
      </div>
      <label>النقدي الموجود فعليًا<input name="countedCash" type="number" min="0" step="0.01" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} required /></label>
      {cashDifference ? <div className="shift-close-difference" data-kind={cashDifference.type} role="status"><span>الفرق</span><strong>{cashDifference.type === "matched" ? "لا يوجد فرق" : cashDifference.type === "shortage" ? `عجز ${money(Math.abs(cashDifference.amount))}` : `زيادة ${money(cashDifference.amount)}`}</strong></div> : null}
      {hasCashDifference ? <label>{cashDifference.type === "shortage" ? "سبب العجز" : "سبب الزيادة"}<textarea name="differenceReason" placeholder="اكتب سبب الفرق باختصار" required /></label> : null}
      <Button type="submit" variant="primary">إغلاق الخزنة وإنهاء الوردية</Button>
    </form></Drawer>
  </div>;
}
