"use client";

import Link from "next/link";
import { Save, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { normalizePhone } from "@/features/customers/services/normalize-phone";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { resolvePreviewEmployee } from "../fixtures";
import { useEmployees } from "../hooks/use-employees";
import { updateOwnProfile } from "../services/employee-store";
import { EmployeeSkeleton } from "./EmployeeSkeleton";
import { employeeStatusLabels, employeeStatusTones } from "./employee-labels";

export function EmployeePersonalProfile() { const { permissions } = useShell(); if (!permissions.has(PERMISSION_KEYS.profile)) return <PermissionDeniedState />; return <OwnProfile />; }
function OwnProfile() {
  const employees = useEmployees(); const branches = useBranches(); const params = useSearchParams(); const { roles } = useShell(); const employee = resolvePreviewEmployee(roles, employees); const branchNames = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]));
  const [values, setValues] = useState(() => ({ alternatePhone: employee.alternatePhone, email: employee.email, address: employee.address, emergencyContactName: employee.emergencyContactName, emergencyContactPhone: employee.emergencyContactPhone })); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const state = params.get("state") ?? "normal"; const offline = state === "offline";
  const activeRoles = useMemo(() => employee.roleAssignments.filter((item) => item.active), [employee]);
  if (state === "loading") return <EmployeeSkeleton detail />;
  function submit(event: FormEvent) { event.preventDefault(); const alternatePhone = normalizePhone(values.alternatePhone); const emergencyContactPhone = normalizePhone(values.emergencyContactPhone); if (alternatePhone && !/^01\d{9}$/.test(alternatePhone)) { setError("أدخل رقمًا بديلًا صحيحًا."); return; } if (offline) return; updateOwnProfile(employee.id, { ...values, alternatePhone, emergencyContactPhone }); setError(""); setNotice("تم تحديث البيانات الشخصية المسموحة داخل Mock State."); }
  return <div className="employee-profile-page" data-profile-employee={employee.id}>
    {offline ? <div className="employees-offline">وضع دون اتصال — تعديل الملف الشخصي معطل.</div> : null}
    <header className="personal-profile-header"><span><UserRound aria-hidden size={25} /></span><div><small>ملفي الشخصي</small><h2>{employee.name}</h2><p>{employee.jobTitle} · <bdi>{employee.employeeNumber}</bdi></p></div><Badge tone={employeeStatusTones[employee.status]}>{employeeStatusLabels[employee.status]}</Badge></header>
    {notice ? <div className="employees-notice" role="status">{notice}</div> : null}
    <div className="personal-profile-grid"><Card><span>بيانات العمل — للعرض فقط</span><dl><div><dt>الفرع الأساسي</dt><dd>{branchNames[employee.primaryBranchId] ?? employee.primaryBranchId}</dd></div><div><dt>الفروع المسندة</dt><dd>{employee.assignedBranchIds.map((id) => branchNames[id] ?? id).join("، ")}</dd></div><div><dt>تاريخ التعيين</dt><dd>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(employee.hireDate))}</dd></div><div><dt>الأدوار</dt><dd className="employee-role-chips">{activeRoles.map((item) => <span key={item.roleKey}>{ROLE_TEMPLATES[item.roleKey].shortLabelAr}</span>)}</dd></div></dl><p className="personal-profile-lock"><ShieldCheck aria-hidden size={16} />لا يمكن تعديل الدور أو الفرع أو الحالة أو الصلاحيات من الملف الشخصي.</p></Card>
      <Card><span>بياناتي القابلة للتعديل</span><form className="personal-profile-form" onSubmit={submit}><label><span>الهاتف الأساسي — للعرض فقط</span><input value={employee.phone} disabled dir="ltr" /></label><label><span>رقم بديل</span><input value={values.alternatePhone} onChange={(event) => setValues({ ...values, alternatePhone: event.target.value })} dir="ltr" /></label><label><span>البريد</span><input value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} type="email" dir="ltr" /></label><label><span>العنوان</span><textarea rows={2} value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} /></label><label><span>جهة اتصال للطوارئ</span><input value={values.emergencyContactName} onChange={(event) => setValues({ ...values, emergencyContactName: event.target.value })} /></label><label><span>هاتف الطوارئ</span><input value={values.emergencyContactPhone} onChange={(event) => setValues({ ...values, emergencyContactPhone: event.target.value })} dir="ltr" /></label>{error ? <small role="alert">{error}</small> : null}<Button type="submit" variant="primary" icon={<Save aria-hidden size={16} />} disabled={offline}>حفظ بياناتي</Button></form></Card>
      <Card className="personal-profile-placeholder"><span>الحضور الشخصي</span><h3>سجل حضوري</h3><p>راجع حضورك وانصرافك وطلبات الاستثناء الخاصة بك فقط.</p><Link className="ui-button ui-button--secondary ui-button--md" href="/attendance/my">فتح سجل حضوري</Link></Card><Card className="personal-profile-placeholder"><span>الإعدادات الشخصية</span><h3>تفضيلات محدودة</h3><p>لا توجد إعدادات نظام أو أدوار أو صلاحيات داخل هذه الصفحة.</p></Card></div>
  </div>;
}
