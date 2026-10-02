import { getAttendanceSnapshot } from "@/features/attendance/services/attendance-store";
import { getEmployeesSnapshot } from "@/features/employees/services/employee-store";
import { EMPLOYEE_FIXTURES } from "@/features/employees/fixtures";
import { recordOutgoingPayment } from "@/features/finance/services/finance-store";
import { markNotificationActedByReference, publishNotification } from "@/features/notifications/services/notification-service";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";
import { addMoney, fromCents, moneyNumber, multiplyMoney, toCents } from "@/lib/utils/money";
import { ADVANCE_FIXTURES, PAYROLL_RUN_FIXTURES, SALARY_PROFILE_FIXTURES } from "../fixtures";
import { validateAdvanceRequest, validateNetAmount } from "../schemas/payroll-schema";
import type { Advance, PayrollComponent, PayrollLine, PayrollRun, PayrollRunStatus, PayrollSnapshot, SalaryProfile } from "../types";

const NOW = "2026-08-06T20:30:00+03:00";
const STORAGE_KEY = "l3bty-local-payroll-v1";
type StoredPayroll = { runs: PayrollRun[]; profiles: SalaryProfile[]; advances: Advance[]; audits: PayrollSnapshot["audits"]; sequence: number };
const cloneRun = (run: PayrollRun): PayrollRun => ({ ...run, lines: run.lines.map((line) => ({ ...line, allowances: line.allowances.map((item) => ({ ...item })), approvedDeductions: line.approvedDeductions.map((item) => ({ ...item })), attendanceAdjustments: line.attendanceAdjustments.map((item) => ({ ...item })) })), timeline: run.timeline.map((item) => ({ ...item })) });
function periodsOverlap(a: Pick<PayrollRun, "periodStart" | "periodEnd">, b: Pick<PayrollRun, "periodStart" | "periodEnd">) { return a.periodStart <= b.periodEnd && b.periodStart <= a.periodEnd; }
function periodLength(run: Pick<PayrollRun, "periodStart" | "periodEnd">) { return Math.round((new Date(`${run.periodEnd}T00:00:00Z`).getTime() - new Date(`${run.periodStart}T00:00:00Z`).getTime()) / 86_400_000) + 1; }
function matchesCurrentSalaryType(run: PayrollRun, salaryProfiles: readonly SalaryProfile[]) {
  return run.lines.reduce((score, line) => {
    const type = salaryProfiles.find((profile) => profile.employeeId === line.employeeId && profile.active)?.salaryType;
    const days = periodLength(run);
    if (type === "weekly" && days === 7) return score + 1;
    if (type === "daily" && days === 1) return score + 1;
    if ((type === "monthly" || type === "hourly") && run.periodStart.endsWith("-01") && days >= 28) return score + 1;
    return score;
  }, 0);
}
function removeDuplicateDraftRuns(items: readonly PayrollRun[], salaryProfiles: readonly SalaryProfile[]) {
  const accepted = items.filter((run) => run.status !== "draft" && run.status !== "cancelled");
  const drafts = items.filter((run) => run.status === "draft").map((run, index) => ({ run, index, score: matchesCurrentSalaryType(run, salaryProfiles) })).sort((a, b) => b.score - a.score || a.index - b.index);
  const keptDraftIds = new Set<string>();
  for (const { run } of drafts) {
    const employees = new Set(run.lines.map((line) => line.employeeId));
    const conflict = accepted.some((old) => old.branchId === run.branchId && periodsOverlap(old, run) && old.lines.some((line) => employees.has(line.employeeId)));
    if (!conflict) { accepted.push(run); keptDraftIds.add(run.id); }
  }
  return items.filter((run) => run.status !== "draft" || keptDraftIds.has(run.id));
}
const stored = readLocalTestData<StoredPayroll>(STORAGE_KEY, 1, { runs: [], profiles: [], advances: [], audits: [], sequence: 300 });
let profiles: readonly SalaryProfile[] = stored.profiles;
let runs: readonly PayrollRun[] = removeDuplicateDraftRuns(stored.runs.map(cloneRun), profiles);
let advances: readonly Advance[] = stored.advances.map((item) => ({ ...item }));
let audits: PayrollSnapshot["audits"] = stored.audits;
let sequence = stored.sequence;
let snapshot: PayrollSnapshot = { runs, profiles, advances, audits };
const listeners = new Set<() => void>();
if (runs.length !== stored.runs.length) writeLocalTestData(STORAGE_KEY, 1, { runs, profiles, advances, audits, sequence });
runs.filter((run) => run.status === "pending_review").forEach((run) => notifyOwnerApprovalRequested(run, run.createdByEmployeeId));

function emit(persist = true) {
  snapshot = { runs, profiles, advances, audits };
  if (persist) writeLocalTestData(STORAGE_KEY, 1, { runs, profiles, advances, audits, sequence });
  listeners.forEach((listener) => listener());
}
function audit(entityType: PayrollSnapshot["audits"][number]["entityType"], entityId: string, action: string, actorEmployeeId: string, reason: string) {
  audits = [{ id: `payroll-audit-${sequence++}`, entityType, entityId, action, actorEmployeeId, reason, at: NOW }, ...audits];
}
function event(action: string, actorEmployeeId: string, reason: string) { return { id: `payroll-timeline-${sequence++}`, action, actorEmployeeId, reason, at: NOW }; }
function totals(lines: readonly PayrollLine[]) { return { employeeCount: lines.length, grossTotal: fromCents(lines.reduce((sum, item) => sum + toCents(item.grossAmount), 0)), deductionsTotal: fromCents(lines.reduce((sum, item) => sum + toCents(item.totalDeductions), 0)), advancesTotal: fromCents(lines.reduce((sum, item) => sum + toCents(item.advancesDeducted), 0)), overtimeTotal: fromCents(lines.reduce((sum, item) => sum + toCents(item.overtimeAmount), 0)), netTotal: fromCents(lines.reduce((sum, item) => sum + toCents(item.netAmount), 0)) }; }
function notifyOwnerApprovalRequested(run: PayrollRun, actorEmployeeId: string) {
  return publishNotification({ recipientUserId: "user-owner", recipientEmployeeId: "employee-owner", type: "payroll_approval_requested", category: "payroll", priority: "high", title: "كشف راتب ينتظر موافقتك", body: `أرسل المدير كشف ${run.payrollNumber} للمراجعة والاعتماد.`, branchId: run.branchId, referenceType: "payroll_run", referenceId: run.id, deepLink: `/payroll/${run.id}`, createdAt: new Date().toISOString(), expiresAt: null, idempotencyKey: `payroll:${run.id}:approval-requested`, metadata: { payrollNumber: run.payrollNumber, sentByEmployeeId: actorEmployeeId } });
}
function baseForPeriod(profile: SalaryProfile) {
  if (profile.salaryType === "monthly") return profile.baseSalary;
  if (profile.salaryType === "weekly") return profile.baseSalary;
  if (profile.salaryType === "daily") {
    const workedDays = getAttendanceSnapshot().days.filter((day) => day.employeeId === profile.employeeId && day.status !== "absent").length;
    return multiplyMoney(profile.baseSalary, workedDays);
  }
  return multiplyMoney(profile.baseSalary, 160);
}

export function subscribePayrollStore(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getPayrollSnapshot() { return snapshot; }
export function saveSalaryProfile(profile: SalaryProfile) {
  if (!profile.employeeId || moneyNumber(profile.baseSalary) <= 0) return { valid: false, message: "اختر موظفًا وأدخل راتبًا صحيحًا." };
  profiles = [profile, ...profiles.filter((item) => item.employeeId !== profile.employeeId)];
  emit();
  return { valid: true, message: "تم حفظ بيانات راتب الموظف." };
}
export function calculatePayrollLine(employeeId: string, runId: string, approvedOvertimeMinutes = 0, approvedDeductions: readonly PayrollComponent[] = []): PayrollLine | undefined {
  const profile = profiles.find((item) => item.employeeId === employeeId && item.active);
  if (!profile) return undefined;
  const baseSalary = baseForPeriod(profile);
  const hourlyRate = profile.salaryType === "weekly" ? multiplyMoney(profile.baseSalary, 1, 60) : multiplyMoney(baseSalary, 1, 240);
  const overtimeMinutes = profile.overtimeEnabled ? approvedOvertimeMinutes : 0;
  const overtimeAmount = profile.overtimeEnabled ? multiplyMoney(hourlyRate, overtimeMinutes, 60) : "0.00";
  const activeAdvance = advances.find((item) => item.employeeId === employeeId && item.status === "active_repayment");
  const advancesDeducted = activeAdvance?.installmentAmount ?? "0.00";
  const grossAmount = addMoney(baseSalary, overtimeAmount, ...profile.allowances.map((item) => item.amount), "0.00");
  const totalDeductions = addMoney(advancesDeducted, ...approvedDeductions.map((item) => item.amount));
  const validated = validateNetAmount(grossAmount, totalDeductions);
  if (!validated.valid) return undefined;
  return { id: `line-${runId}-${employeeId}`, payrollRunId: runId, employeeId, baseSalary, overtimeMinutes, overtimeRate: hourlyRate, overtimeAmount, attendanceAdjustments: [], approvedDeductions: [...approvedDeductions], allowances: [...profile.allowances], commissions: "0.00", advancesDeducted, grossAmount, totalDeductions, netAmount: validated.net, status: "draft", note: "لا تُطبق معلومات الحضور أو فروق الوردية كخصم تلقائي.", paymentId: null };
}
export function createPayrollRun(input: { periodStart: string; periodEnd: string; branchId: string; actorEmployeeId: string; employeeId?: string }) {
  const employeeSource = process.env.NODE_ENV === "test" ? EMPLOYEE_FIXTURES : getEmployeesSnapshot();
  const employees = employeeSource.filter((item) => item.status === "active" && (!input.employeeId || item.id === input.employeeId) && (input.branchId === "all" || item.assignedBranchIds.includes(input.branchId)));
  if (!employees.length) return { valid: false, message: "لا يوجد موظفون نشطون في النطاق المختار." };
  const id = `payroll-${sequence++}`;
  const lines = employees.map((employee) => calculatePayrollLine(employee.id, id)).filter((item): item is PayrollLine => Boolean(item));
  if (lines.length !== employees.length) return { valid: false, message: "يوجد موظف نشط لم تُسجل بيانات راتبه بعد." };
  const duplicate = runs.find((run) => run.status !== "cancelled" && periodsOverlap(run, input) && lines.some((line) => run.lines.some((old) => old.employeeId === line.employeeId)));
  if (duplicate) return { valid: false, message: "تم تجهيز كشف راتب لهذه الفترة بالفعل. افتح الكشف الموجود لمراجعته بدل إنشاء نسخة أخرى.", run: duplicate };
  const run: PayrollRun = { id, payrollNumber: `PAYROLL-${input.periodStart.slice(0, 7)}-${String(sequence).padStart(3, "0")}`, periodStart: input.periodStart, periodEnd: input.periodEnd, branchId: input.branchId, status: "draft", ...totals(lines), createdByEmployeeId: input.actorEmployeeId, approvedByEmployeeId: null, createdAt: NOW, approvedAt: null, paidAt: null, lockedAt: null, lines, timeline: [event("created", input.actorEmployeeId, "حساب مسودة الرواتب من البيانات الحالية")] };
  runs = [run, ...runs]; audit("run", id, "created", input.actorEmployeeId, "إنشاء دورة رواتب"); emit();
  return { valid: true, message: "تم إنشاء مسودة دورة الرواتب.", run };
}
export function transitionPayrollRun(id: string, action: "recalculate" | "submit" | "approve" | "lock" | "cancel", actor: string, reason: string, actorRole?: "owner" | "manager") {
  const current = runs.find((item) => item.id === id);
  if (!current) return { valid: false, message: "الدورة غير موجودة." };
  if (current.status === "locked") return { valid: false, message: "لا يمكن تعديل دورة مقفلة." };
  if (reason.trim().length < 5) return { valid: false, message: "سبب الإجراء إلزامي." };
  let status: PayrollRunStatus = current.status;
  if (action === "submit" && current.status === "draft") status = "pending_review";
  else if (action === "approve" && (current.status === "pending_review" || (current.status === "draft" && actorRole === "owner"))) status = "approved";
  else if (action === "lock" && current.lines.every((line) => line.status === "paid")) status = "locked";
  else if (action === "cancel" && current.status === "draft") status = "cancelled";
  else if (action !== "recalculate") return { valid: false, message: "الإجراء غير متاح في حالة الدورة الحالية." };
  runs = runs.map((run) => run.id === id ? { ...run, status, approvedByEmployeeId: action === "approve" ? actor : run.approvedByEmployeeId, approvedAt: action === "approve" ? NOW : run.approvedAt, lockedAt: action === "lock" ? NOW : run.lockedAt, timeline: [event(action, actor, reason), ...run.timeline] } : run);
  audit("run", id, action, actor, reason); emit();
  if (action === "submit") notifyOwnerApprovalRequested(current, actor);
  if (action === "approve") markNotificationActedByReference("payroll_run", current.id, "user-owner");
  return { valid: true, message: action === "submit" ? "تم إرسال كشف الراتب للمالك وإشعاره بالمراجعة." : "تم تحديث دورة الرواتب." };
}
export function payPayrollLine(runId: string, lineId: string, cashboxId: string, actor: string) {
  const run = runs.find((item) => item.id === runId); const line = run?.lines.find((item) => item.id === lineId);
  if (!run || !line || !["approved", "partially_paid"].includes(run.status) || line.status === "paid") return { valid: false, message: "سطر الراتب غير جاهز للدفع أو دُفع سابقًا." };
  const employee = (process.env.NODE_ENV === "test" ? EMPLOYEE_FIXTURES : getEmployeesSnapshot()).find((item) => item.id === line.employeeId);
  if (!employee) return { valid: false, message: "الموظف غير موجود." };
  const result = recordOutgoingPayment({ branchId: employee.primaryBranchId, cashboxId, sourceType: "payroll", sourceId: line.id, amount: moneyNumber(line.netAmount), employeeId: line.employeeId, actorEmployeeId: actor, reason: `دفع راتب ${run.payrollNumber}`, idempotencyKey: `payroll-${line.id}` });
  if (!result.valid || !("payment" in result)) return result;
  runs = runs.map((item) => { if (item.id !== runId) return item; const lines = item.lines.map((row) => row.id === lineId ? { ...row, status: "paid" as const, paymentId: result.payment.id } : row); const allPaid = lines.every((row) => row.status === "paid"); return { ...item, lines, status: allPaid ? "paid" : "partially_paid", paidAt: allPaid ? NOW : item.paidAt, timeline: [event("line_paid", actor, `دفع ${line.employeeId}`), ...item.timeline] }; });
  audit("line", line.id, "paid", actor, "دفع الراتب"); emit(); return { valid: true, message: "تم دفع سطر الراتب مرة واحدة." };
}
export function requestAdvance(input: { employeeId: string; branchId: string; amount: string; installmentCount: number; reason: string; employeeNote: string; idempotencyKey: string; netSalary?: string }) {
  const existing = advances.find((item) => item.idempotencyKey === input.idempotencyKey); if (existing) return { valid: true, message: "تم استخدام طلب السلفة السابق.", advance: existing, duplicate: true };
  const validation = validateAdvanceRequest(input.amount, input.installmentCount, input.netSalary); if (!validation.valid) return validation;
  const amount = fromCents(toCents(input.amount)); const item: Advance = { id: `advance-${sequence++}`, advanceNumber: `ADV-2026-${String(sequence).padStart(4, "0")}`, employeeId: input.employeeId, branchId: input.branchId, requestedAmount: amount, approvedAmount: "0.00", remainingAmount: "0.00", installmentAmount: "0.00", installmentCount: input.installmentCount, installmentsPaid: 0, requestedAt: NOW, approvedAt: null, status: "pending", reason: input.reason, employeeNote: input.employeeNote, reviewerNote: "", approvedBy: null, paymentId: null, idempotencyKey: input.idempotencyKey };
  advances = [item, ...advances]; audit("advance", item.id, "requested", input.employeeId, input.reason); emit(); return { valid: true, message: "تم إرسال طلب السلفة للمراجعة.", advance: item, duplicate: false };
}
export function reviewAdvance(id: string, actor: string, decision: "approved" | "rejected" | "cancelled", approvedAmount: string, installmentCount: number, note: string, exceptionApproved = false) {
  const current = advances.find((item) => item.id === id); if (!current || current.status !== "pending" || note.trim().length < 5) return { valid: false, message: "طلب السلفة أو سبب القرار غير صحيح." };
  const profile = profiles.find((item) => item.employeeId === current.employeeId); const validation = validateAdvanceRequest(approvedAmount, installmentCount, profile?.baseSalary); if (decision === "approved" && !validation.valid && !exceptionApproved) return validation;
  const amount = decision === "approved" ? fromCents(toCents(approvedAmount)) : "0.00"; const installment = decision === "approved" ? fromCents(Math.ceil(toCents(amount) / installmentCount)) : "0.00";
  advances = advances.map((item) => item.id === id ? { ...item, status: decision, approvedAmount: amount, remainingAmount: amount, installmentAmount: installment, installmentCount, approvedAt: decision === "approved" ? NOW : null, approvedBy: actor, reviewerNote: note } : item);
  audit("advance", id, decision, actor, note); emit(); return { valid: true, message: "تم حفظ قرار السلفة." };
}
export function payAdvance(id: string, cashboxId: string, actor: string) {
  const current = advances.find((item) => item.id === id); if (!current || current.status !== "approved" || current.paymentId) return { valid: false, message: "السلفة غير جاهزة للدفع أو دُفعت سابقًا." };
  const result = recordOutgoingPayment({ branchId: current.branchId, cashboxId, sourceType: "advance", sourceId: current.id, amount: moneyNumber(current.approvedAmount), employeeId: current.employeeId, actorEmployeeId: actor, reason: `دفع السلفة ${current.advanceNumber}`, idempotencyKey: `pay-${current.id}` }); if (!result.valid || !("payment" in result)) return result;
  advances = advances.map((item) => item.id === id ? { ...item, status: "active_repayment", paymentId: result.payment.id } : item); audit("advance", id, "paid", actor, "دفع السلفة من خزينة معتمدة"); emit(); return { valid: true, message: "تم دفع السلفة وربطها بحركة خزينة." };
}
export function resetPayrollStore() {
  runs = PAYROLL_RUN_FIXTURES.map(cloneRun); profiles = SALARY_PROFILE_FIXTURES.map((item) => ({ ...item, allowances: item.allowances.map((row) => ({ ...row })), defaultDeductions: item.defaultDeductions.map((row) => ({ ...row })) })); advances = ADVANCE_FIXTURES.map((item) => ({ ...item })); audits = []; sequence = 300; removeLocalTestData(STORAGE_KEY); emit(false);
}
