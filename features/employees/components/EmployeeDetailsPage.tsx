"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MoreHorizontal, Pencil, RadioTower, TimerReset } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { usePayroll } from "@/features/payroll/hooks/use-payroll";
import { getTodayLocalDate } from "@/features/payroll/services/payroll-period";
import { saveSalaryProfile } from "@/features/payroll/services/payroll-store";
import { toBranchOption } from "@/mock-data/branches";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { resolvePreviewEmployee } from "../fixtures";
import { EmployeeForm, type EmployeeSalaryValues } from "../forms/EmployeeForm";
import { useEmployees } from "../hooks/use-employees";
import { updateEmployee } from "../services/employee-store";
import type { EmployeeFormValues, EmployeeViewState } from "../types";
import { EmployeeBranchAssignments } from "./EmployeeBranchAssignments";
import { EmployeeContactCard } from "./EmployeeContactCard";
import { EmployeeOverview } from "./EmployeeOverview";
import { EmployeeRoleAssignments } from "./EmployeeRoleAssignments";
import { EmployeeSkeleton } from "./EmployeeSkeleton";
import { EmployeeStatusHistory } from "./EmployeeStatusHistory";
import { employeeStatusLabels, employeeStatusTones } from "./employee-labels";

const validStates = ["normal", "loading", "error", "offline"];
export function EmployeeDetailsPage({ employeeId }: { employeeId: string }) { const { permissions } = useShell(); if (!permissions.has(PERMISSION_KEYS.employees)) return <PermissionDeniedState />; return <EmployeeAdminDetails employeeId={employeeId} />; }

function EmployeeAdminDetails({ employeeId }: { employeeId: string }) {
  const employees = useEmployees(); const branches = useBranches(); const payroll = usePayroll(); const params = useSearchParams(); const { roles } = useShell();
  const employee = employees.find((item) => item.id === employeeId); const previewEmployee = resolvePreviewEmployee(roles, employees); const [editOpen, setEditOpen] = useState(false); const [notice, setNotice] = useState("");
  const state = (validStates.includes(params.get("state") ?? "") ? params.get("state") : "normal") as EmployeeViewState;
  if (state === "loading") return <EmployeeSkeleton detail />;
  if (!employee) return <Card className="employees-state"><b>404</b><h2>الموظف غير موجود</h2><p>لا يوجد موظف مسجل بهذا المعرّف.</p><Link className="ui-button ui-button--primary ui-button--md" href="/employees">العودة إلى الموظفين</Link></Card>;
  if (state === "error") return <Card className="employees-state employees-state--error"><h2>تعذر تحميل ملف الموظف</h2><p>رمز الخطأ: EMP-DETAIL-503</p></Card>;
  const resolvedEmployee = employee;
  const branchOptions = branches.map(toBranchOption); const branchNames = Object.fromEntries(branchOptions.map((branch) => [branch.id, branch.nameAr])); const offline = state === "offline";
  const salaryProfile = payroll.profiles.find((profile) => profile.employeeId === resolvedEmployee.id && profile.active);
  function save(values: EmployeeFormValues, salary: EmployeeSalaryValues) { const updated = updateEmployee(resolvedEmployee.id, values); if (!updated) return; saveSalaryProfile({ employeeId: updated.id, baseSalary: salary.baseSalary, salaryType: salary.salaryType, effectiveFrom: salaryProfile?.effectiveFrom ?? getTodayLocalDate(), active: true, overtimeEnabled: salaryProfile?.overtimeEnabled ?? false, overtimeRateType: "normal", allowances: salaryProfile?.allowances ?? [], defaultDeductions: salaryProfile?.defaultDeductions ?? [], commissionsEnabled: salaryProfile?.commissionsEnabled ?? false }); setEditOpen(false); setNotice("تم تحديث بيانات الموظف وراتبه بنجاح."); }
  return <div className="employee-details-page">
    {offline ? <div className="employees-offline"><RadioTower aria-hidden size={17} />وضع دون اتصال — التعديل وتغيير الحالة معطلان.</div> : null}
    <Link className="employee-back-link" href="/employees"><ArrowRight aria-hidden size={16} />العودة إلى الموظفين</Link>
    <Card className="employee-profile-header"><div><span>ملف الموظف · <bdi>{employee.employeeNumber}</bdi></span><h2>{employee.name}</h2><p>{employee.jobTitle} · {branchNames[employee.primaryBranchId] ?? "فرع غير معروف"}</p><Badge tone={employeeStatusTones[employee.status]}>{employeeStatusLabels[employee.status]}</Badge></div><div><Button icon={<Pencil aria-hidden size={16} />} onClick={() => setEditOpen(true)} disabled={offline}>تعديل</Button><Button variant="ghost" icon={<MoreHorizontal aria-hidden size={17} />} disabled>المزيد</Button></div></Card>
    {notice ? <div className="employees-notice" role="status">{notice}</div> : null}
    <EmployeeOverview employee={employee} branchNames={branchNames} />
    <div className="employee-details-grid"><EmployeeContactCard employee={employee} /><EmployeeRoleAssignments employee={employee} /><EmployeeBranchAssignments employee={employee} branchNames={branchNames} /><EmployeeStatusHistory employee={employee} /><Placeholder icon={CalendarDays} eyebrow="ملخص الحضور" title="الحضور والانصراف" text="لا توجد سجلات حضور مسجلة لهذا الموظف." /><Placeholder icon={TimerReset} eyebrow="الورديات" title="ورديات الموظف" text="لا توجد ورديات مسجلة لهذا الموظف." /><Placeholder icon={FileText} eyebrow="المستندات" title="مستندات الموظف" text="لا توجد مستندات مسجلة لهذا الموظف." /><Card className="employee-detail-card"><span>النشاط الأخير</span><h3>تحديثات الموظف</h3><p>آخر نشاط: {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(employee.lastActiveAt))}</p><p>آخر تحديث للسجل: {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(employee.updatedAt))}</p></Card></div>
    <Drawer open={editOpen} onOpenChange={setEditOpen} title="تعديل الموظف" description="تحديث بيانات الموظف ودوره وفرعه وراتبه." variant="auxiliary"><EmployeeForm key={employee.updatedAt} employees={employees} branches={branchOptions} initialEmployee={employee} initialSalary={salaryProfile ? { salaryType: salaryProfile.salaryType, baseSalary: salaryProfile.baseSalary } : undefined} currentPreviewEmployeeId={previewEmployee.id} offline={offline} onCancel={() => setEditOpen(false)} onSave={save} /></Drawer>
  </div>;
}
function Placeholder({ icon: Icon, eyebrow, title, text }: { icon: typeof CalendarDays; eyebrow: string; title: string; text: string }) { return <Card className="employee-detail-card employee-detail-card--placeholder"><Icon aria-hidden size={20} /><span>{eyebrow}</span><h3>{title}</h3><p>{text}</p></Card>; }
