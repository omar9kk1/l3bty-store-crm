"use client";

import Link from "next/link";
import { AlertTriangle, Save, ShieldAlert, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { BranchOption } from "@/features/branches/types";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { ROLE_IDS } from "@/permissions/types";
import { EMPTY_EMPLOYEE_FORM, validateEmployeeForm } from "../schemas/employee-schema";
import type { Employee, EmployeeFormValues } from "../types";
import { employmentTypeLabels, employeeStatusLabels } from "../components/employee-labels";

export function EmployeeForm({ employees, branches, initialEmployee, currentPreviewEmployeeId, offline = false, onCancel, onSave }: { employees: readonly Employee[]; branches: readonly BranchOption[]; initialEmployee?: Employee; currentPreviewEmployeeId: string; offline?: boolean; onCancel: () => void; onSave: (values: EmployeeFormValues) => void }) {
  const realBranches = useMemo(() => branches.filter((branch) => branch.id !== "all"), [branches]);
  const initial = useMemo<EmployeeFormValues>(() => initialEmployee ? { employeeNumber: initialEmployee.employeeNumber, name: initialEmployee.name, phone: initialEmployee.phone, alternatePhone: initialEmployee.alternatePhone, email: initialEmployee.email, nationalIdLast4: initialEmployee.nationalIdLast4, jobTitle: initialEmployee.jobTitle, status: initialEmployee.status, primaryBranchId: initialEmployee.primaryBranchId, assignedBranchIds: [...initialEmployee.assignedBranchIds], roleKeys: initialEmployee.roleAssignments.filter((item) => item.active).map((item) => item.roleKey), hireDate: initialEmployee.hireDate, employmentType: initialEmployee.employmentType, emergencyContactName: initialEmployee.emergencyContactName, emergencyContactPhone: initialEmployee.emergencyContactPhone, address: initialEmployee.address, notes: initialEmployee.notes, adminAccessConfirmed: false, adminAccessReason: "", statusReason: "" } : { ...EMPTY_EMPLOYEE_FORM, employeeNumber: `EMP-${String(employees.length + 1).padStart(4, "0")}`, primaryBranchId: realBranches[0]?.id ?? "", assignedBranchIds: realBranches[0] ? [realBranches[0].id] : [] }, [employees.length, initialEmployee, realBranches]);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<ReturnType<typeof validateEmployeeForm>["errors"]>({});
  const [duplicate, setDuplicate] = useState<Employee>();
  const hasAdminRole = values.roleKeys.some((role) => role === "owner" || role === "manager");

  function update<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); }
  function toggleRole(role: string) { const roleKeys = values.roleKeys.includes(role) ? values.roleKeys.filter((item) => item !== role) : [...values.roleKeys, role]; const admin = roleKeys.some((item) => item === "owner" || item === "manager"); setValues((current) => ({ ...current, roleKeys, assignedBranchIds: admin ? realBranches.map((branch) => branch.id) : current.assignedBranchIds, adminAccessConfirmed: admin ? current.adminAccessConfirmed : false, adminAccessReason: admin ? current.adminAccessReason : "" })); setErrors((current) => ({ ...current, roleKeys: undefined, assignedBranchIds: undefined, adminAccessReason: undefined })); }
  function toggleBranch(branchId: string) { if (hasAdminRole) return; const assignedBranchIds = values.assignedBranchIds.includes(branchId) ? values.assignedBranchIds.filter((id) => id !== branchId) : [...values.assignedBranchIds, branchId]; update("assignedBranchIds", assignedBranchIds); }
  function submit(event: FormEvent) { event.preventDefault(); const result = validateEmployeeForm(values, employees, { currentEmployeeId: initialEmployee?.id, currentPreviewEmployeeId }); setErrors(result.errors); setDuplicate(result.duplicate); if (!result.valid || offline) return; onSave(result.normalizedValues); }

  return <form className="employee-form" onSubmit={submit} noValidate>
    {offline ? <div className="employee-form__notice"><AlertTriangle aria-hidden size={17} />الحفظ وتغيير الحالة معطلان دون اتصال.</div> : null}
    <div className="employee-form__grid">
      <Field label="الاسم *" error={errors.name}><input value={values.name} onChange={(event) => update("name", event.target.value)} /></Field>
      <Field label="رقم الموظف *" error={errors.employeeNumber}><input value={values.employeeNumber} onChange={(event) => update("employeeNumber", event.target.value)} dir="ltr" /></Field>
      <Field label="الهاتف *" error={errors.phone}><input value={values.phone} onChange={(event) => update("phone", event.target.value)} inputMode="tel" dir="ltr" /></Field>
      <Field label="رقم بديل" error={errors.alternatePhone}><input value={values.alternatePhone} onChange={(event) => update("alternatePhone", event.target.value)} inputMode="tel" dir="ltr" /></Field>
      {duplicate ? <div className="employee-duplicate" role="alert"><UserRound aria-hidden size={19} /><div><strong>البيانات مستخدمة بالفعل</strong><span>{duplicate.name} · {duplicate.employeeNumber}</span><Link href={`/employees/${duplicate.id}`}>فتح ملف الموظف</Link></div></div> : null}
      <Field label="البريد" error={errors.email}><input value={values.email} onChange={(event) => update("email", event.target.value)} type="email" dir="ltr" /></Field>
      <Field label="آخر 4 أرقام تجريبية" error={errors.nationalIdLast4}><input value={values.nationalIdLast4} onChange={(event) => update("nationalIdLast4", event.target.value)} inputMode="numeric" dir="ltr" maxLength={4} /></Field>
      <Field label="المسمى الوظيفي *" error={errors.jobTitle}><input value={values.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} /></Field>
      <Field label="نوع التوظيف" error={errors.employmentType}><select value={values.employmentType} onChange={(event) => update("employmentType", event.target.value as EmployeeFormValues["employmentType"])}>{Object.entries(employmentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="تاريخ التعيين *" error={errors.hireDate}><input value={values.hireDate} onChange={(event) => update("hireDate", event.target.value)} type="date" dir="ltr" /></Field>
      <Field label="الحالة" error={errors.status}><select value={values.status} onChange={(event) => update("status", event.target.value as EmployeeFormValues["status"])}>{Object.entries(employeeStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      {initialEmployee && initialEmployee.status !== values.status ? <Field label="سبب تغيير الحالة *" error={errors.statusReason}><input value={values.statusReason} onChange={(event) => update("statusReason", event.target.value)} /></Field> : null}
    </div>
    <fieldset className="employee-assignment"><legend>الأدوار الفعالة *</legend><div className="employee-check-grid">{ROLE_IDS.map((role) => <label key={role}><input type="checkbox" checked={values.roleKeys.includes(role)} onChange={() => toggleRole(role)} /><span>{ROLE_TEMPLATES[role].labelAr}</span></label>)}</div>{errors.roleKeys ? <small role="alert">{errors.roleKeys}</small> : null}</fieldset>
    {hasAdminRole ? <div className="employee-admin-warning"><ShieldAlert aria-hidden size={20} /><div><strong>وصول إداري كامل إلى كل النظام والفروع</strong><p>يتطلب الإسناد تأكيدًا وسببًا تجريبيًا مسجلًا.</p><label><input type="checkbox" checked={values.adminAccessConfirmed} onChange={(event) => update("adminAccessConfirmed", event.target.checked)} />أؤكد منح الوصول الكامل</label><input value={values.adminAccessReason} onChange={(event) => update("adminAccessReason", event.target.value)} placeholder="سبب الإسناد" />{errors.adminAccessReason ? <small role="alert">{errors.adminAccessReason}</small> : null}</div></div> : null}
    <fieldset className="employee-assignment"><legend>الفروع المسندة *</legend><div className="employee-check-grid">{realBranches.map((branch) => <label key={branch.id}><input type="checkbox" checked={hasAdminRole || values.assignedBranchIds.includes(branch.id)} disabled={hasAdminRole} onChange={() => toggleBranch(branch.id)} /><span>{branch.nameAr} · {branch.code}</span></label>)}</div>{errors.assignedBranchIds ? <small role="alert">{errors.assignedBranchIds}</small> : null}</fieldset>
    <Field label="الفرع الأساسي *" error={errors.primaryBranchId}><select value={values.primaryBranchId} onChange={(event) => update("primaryBranchId", event.target.value)}><option value="">اختر الفرع</option>{realBranches.filter((branch) => hasAdminRole || values.assignedBranchIds.includes(branch.id)).map((branch) => <option key={branch.id} value={branch.id}>{branch.nameAr}</option>)}</select></Field>
    <div className="employee-form__grid"><Field label="جهة اتصال للطوارئ" error={errors.emergencyContactName}><input value={values.emergencyContactName} onChange={(event) => update("emergencyContactName", event.target.value)} /></Field><Field label="هاتف الطوارئ" error={errors.emergencyContactPhone}><input value={values.emergencyContactPhone} onChange={(event) => update("emergencyContactPhone", event.target.value)} inputMode="tel" dir="ltr" /></Field></div>
    <Field label="العنوان" error={errors.address}><textarea rows={2} value={values.address} onChange={(event) => update("address", event.target.value)} /></Field>
    <Field label="ملاحظات" error={errors.notes}><textarea rows={3} value={values.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
    <div className="employee-form__actions"><Button type="submit" variant="primary" icon={<Save aria-hidden size={17} />} disabled={offline || Boolean(duplicate)}>حفظ الموظف</Button><Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button></div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="employee-field"><span>{label}</span>{children}{error ? <small role="alert">{error}</small> : null}</label>; }
