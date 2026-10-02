"use client";

import Link from "next/link";
import { AlertTriangle, Save, ShieldAlert, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { BranchOption } from "@/features/branches/types";
import type { SalaryType } from "@/features/payroll/types";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { ROLE_IDS, type RoleId } from "@/permissions/types";
import { EMPTY_EMPLOYEE_FORM, getNextEmployeeNumber, validateEmployeeForm } from "../schemas/employee-schema";
import type { Employee, EmployeeFormValues } from "../types";
import { employeeStatusLabels } from "../components/employee-labels";

export interface EmployeeSalaryValues { salaryType: SalaryType; baseSalary: string }

export function EmployeeForm({ employees, branches, initialEmployee, initialSalary, currentPreviewEmployeeId, offline = false, onCancel, onSave }: { employees: readonly Employee[]; branches: readonly BranchOption[]; initialEmployee?: Employee; initialSalary?: EmployeeSalaryValues; currentPreviewEmployeeId: string; offline?: boolean; onCancel: () => void; onSave: (values: EmployeeFormValues, salary: EmployeeSalaryValues) => void }) {
  const realBranches = useMemo(() => branches.filter((branch) => branch.id !== "all"), [branches]);
  const initial = useMemo<EmployeeFormValues>(() => initialEmployee ? { employeeNumber: initialEmployee.employeeNumber, name: initialEmployee.name, phone: initialEmployee.phone, alternatePhone: initialEmployee.alternatePhone, email: initialEmployee.email, nationalIdLast4: initialEmployee.nationalIdLast4, jobTitle: initialEmployee.jobTitle, status: initialEmployee.status, primaryBranchId: initialEmployee.primaryBranchId, assignedBranchIds: [...initialEmployee.assignedBranchIds], roleKeys: initialEmployee.roleAssignments.filter((item) => item.active).slice(0, 1).map((item) => item.roleKey), hireDate: initialEmployee.hireDate, employmentType: initialEmployee.employmentType, emergencyContactName: initialEmployee.emergencyContactName, emergencyContactPhone: initialEmployee.emergencyContactPhone, address: initialEmployee.address, notes: initialEmployee.notes, adminAccessConfirmed: false, adminAccessReason: "", statusReason: "" } : { ...EMPTY_EMPLOYEE_FORM, employeeNumber: getNextEmployeeNumber(employees) }, [employees, initialEmployee]);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<ReturnType<typeof validateEmployeeForm>["errors"]>({});
  const [duplicate, setDuplicate] = useState<Employee>();
  const [salaryType, setSalaryType] = useState<SalaryType>(initialSalary?.salaryType ?? "monthly");
  const [baseSalary, setBaseSalary] = useState(initialSalary?.baseSalary ?? "");
  const [salaryError, setSalaryError] = useState("");
  const hasAdminRole = values.roleKeys.some((role) => role === "owner" || role === "manager");

  function update<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); }
  function selectRole(role: RoleId) { const admin = role === "owner" || role === "manager"; const branchId = values.primaryBranchId; setValues((current) => ({ ...current, roleKeys: [role], jobTitle: ROLE_TEMPLATES[role].labelAr, primaryBranchId: branchId, assignedBranchIds: admin ? realBranches.map((branch) => branch.id) : branchId ? [branchId] : [], adminAccessConfirmed: admin ? current.adminAccessConfirmed : false, adminAccessReason: admin ? current.adminAccessReason : "" })); setErrors((current) => ({ ...current, roleKeys: undefined, assignedBranchIds: undefined, primaryBranchId: undefined, adminAccessReason: undefined })); }
  function selectBranch(branchId: string) { setValues((current) => { const admin = current.roleKeys.some((role) => role === "owner" || role === "manager"); return { ...current, primaryBranchId: branchId, assignedBranchIds: admin ? realBranches.map((branch) => branch.id) : branchId ? [branchId] : [] }; }); setErrors((current) => ({ ...current, primaryBranchId: undefined, assignedBranchIds: undefined })); }
  function submit(event: FormEvent) { event.preventDefault(); const result = validateEmployeeForm(values, employees, { currentEmployeeId: initialEmployee?.id, currentPreviewEmployeeId }); const salaryAmount = Number(baseSalary); const nextSalaryError = !Number.isFinite(salaryAmount) || salaryAmount <= 0 ? "أدخل قيمة راتب صحيحة أكبر من صفر." : ""; setErrors(result.errors); setDuplicate(result.duplicate); setSalaryError(nextSalaryError); if (!result.valid || nextSalaryError || offline) return; onSave(result.normalizedValues, { salaryType, baseSalary: salaryAmount.toFixed(2) }); }

  return <form className="employee-form" onSubmit={submit} noValidate>
    {offline ? <div className="employee-form__notice"><AlertTriangle aria-hidden size={17} />الحفظ وتغيير الحالة معطلان دون اتصال.</div> : null}
    <div className="employee-form__grid">
      <Field label="الاسم *" error={errors.name}><input value={values.name} onChange={(event) => update("name", event.target.value)} /></Field>
      <div className="employee-field"><span>كود الموظف التلقائي</span><output className="employee-generated-number" aria-label="كود الموظف المُنشأ تلقائيًا"><bdi>{values.employeeNumber}</bdi></output></div>
      <Field label="الهاتف *" error={errors.phone}><input value={values.phone} onChange={(event) => update("phone", event.target.value)} inputMode="tel" dir="ltr" /></Field>
      {duplicate ? <div className="employee-duplicate" role="alert"><UserRound aria-hidden size={19} /><div><strong>البيانات مستخدمة بالفعل</strong><span>{duplicate.name} · {duplicate.employeeNumber}</span><Link href={`/employees/${duplicate.id}`}>فتح ملف الموظف</Link></div></div> : null}
      {initialEmployee ? <Field label="الحالة" error={errors.status}><select value={values.status} onChange={(event) => update("status", event.target.value as EmployeeFormValues["status"])}>{Object.entries(employeeStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field> : null}
      {initialEmployee && initialEmployee.status !== values.status ? <Field label="سبب تغيير الحالة *" error={errors.statusReason}><input value={values.statusReason} onChange={(event) => update("statusReason", event.target.value)} /></Field> : null}
    </div>
    <Field label="الدور *" error={errors.roleKeys}><select value={values.roleKeys[0] ?? ""} onChange={(event) => event.target.value ? selectRole(event.target.value as RoleId) : update("roleKeys", [])}><option value="">اختر الدور</option>{ROLE_IDS.map((role) => <option key={role} value={role}>{ROLE_TEMPLATES[role].labelAr}</option>)}</select></Field>
    {hasAdminRole ? <div className="employee-admin-warning"><ShieldAlert aria-hidden size={20} /><div><strong>وصول إداري كامل إلى كل النظام والفروع</strong><p>يتطلب الإسناد تأكيدًا وسببًا مسجلًا.</p><label><input type="checkbox" checked={values.adminAccessConfirmed} onChange={(event) => update("adminAccessConfirmed", event.target.checked)} />أؤكد منح الوصول الكامل</label><input value={values.adminAccessReason} onChange={(event) => update("adminAccessReason", event.target.value)} placeholder="سبب الإسناد" />{errors.adminAccessReason ? <small role="alert">{errors.adminAccessReason}</small> : null}</div></div> : null}
    <Field label="الفرع *" error={errors.primaryBranchId ?? errors.assignedBranchIds}><select value={values.primaryBranchId} onChange={(event) => selectBranch(event.target.value)} required><option value="">اختر الفرع</option>{realBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nameAr}</option>)}</select></Field>
    <div className="employee-form__grid">
      <Field label="نوع الراتب *"><select value={salaryType} onChange={(event) => setSalaryType(event.target.value as SalaryType)}><option value="monthly">شهري</option><option value="weekly">أسبوعي</option><option value="daily">يومي</option><option value="hourly">بالساعة</option></select></Field>
      <Field label="قيمة الراتب *" error={salaryError}><input type="number" min="0.01" step="0.01" inputMode="decimal" value={baseSalary} onChange={(event) => { setBaseSalary(event.target.value); setSalaryError(""); }} placeholder="0.00" /></Field>
    </div>
    <div className="employee-form__actions"><Button type="submit" variant="primary" icon={<Save aria-hidden size={17} />} disabled={offline || Boolean(duplicate)}>حفظ الموظف</Button><Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button></div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="employee-field"><span>{label}</span>{children}{error ? <small role="alert">{error}</small> : null}</label>; }
