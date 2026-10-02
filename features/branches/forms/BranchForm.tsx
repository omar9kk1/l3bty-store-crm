"use client";

import Link from "next/link";
import { AlertCircle, Building2, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EMPTY_BRANCH_FORM, getNextBranchCode, validateBranchForm } from "../schemas/branch-schema";
import type { Branch, BranchFormErrors, BranchFormValues, BranchStatus, BranchType } from "../types";

function branchToForm(branches: readonly Branch[], branch?: Branch): BranchFormValues {
  if (!branch) return { ...EMPTY_BRANCH_FORM, code: getNextBranchCode(branches) };
  const hours = branch.workingHours[0];
  return {
    name: branch.name, code: branch.code, type: branch.type, status: branch.status, phone: branch.phone,
    alternatePhone: branch.alternatePhone, city: branch.city, area: branch.area, address: branch.address,
    managerEmployeeId: branch.managerEmployeeId, latitude: String(branch.latitude), longitude: String(branch.longitude),
    geofenceRadiusMeters: String(branch.geofenceRadiusMeters), opensAt: hours?.opensAt ?? "10:00",
    closesAt: hours?.closesAt ?? "22:00", crossesMidnight: hours?.crossesMidnight ?? false,
    notes: branch.notes, statusReason: "",
  };
}

export function BranchForm({ branches, initialBranch, offline = false, onCancel, onSave }: { branches: readonly Branch[]; initialBranch?: Branch; offline?: boolean; onCancel: () => void; onSave: (values: BranchFormValues) => void }) {
  const initialValues = useMemo(() => branchToForm(branches, initialBranch), [branches, initialBranch]);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<BranchFormErrors>({});
  const [duplicate, setDuplicate] = useState<Branch>();
  function update<K extends keyof BranchFormValues>(key: K, value: BranchFormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateBranchForm(values, branches, initialBranch);
    setErrors(result.errors); setDuplicate(result.duplicate);
    if (!result.valid || offline) return;
    onSave(result.normalizedValues);
  }
  return <form className="branch-form" onSubmit={submit} noValidate>
    {offline ? <div className="branch-form__notice"><AlertCircle aria-hidden size={17} />الحفظ وتغيير الحالة يحتاجان اتصالًا.</div> : null}
    <label className="branch-field"><span>اسم الفرع أو الموقع <b>*</b></span><input value={values.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} />{errors.name ? <small role="alert">{errors.name}</small> : null}</label>
    <div className="branch-field"><span>كود الفرع التلقائي</span><output className="branch-generated-code" aria-label="كود الفرع المُنشأ تلقائيًا"><bdi>{values.code}</bdi></output><small className="branch-field__hint">سيُحفظ بهذا الكود تلقائيًا، ولا تحتاج إلى إدخاله.</small></div>
    {duplicate ? <div className="branch-duplicate" role="alert"><Building2 aria-hidden size={20} /><div><strong>الكود مستخدم بالفعل</strong><span>{duplicate.name} · {duplicate.code}</span><Link href={`/branches/${duplicate.id}`}>فتح الموقع الموجود</Link></div></div> : null}
    <label className="branch-field"><span>نوع الموقع <b>*</b></span><select value={values.type} onChange={(event) => update("type", event.target.value as BranchType)}><option value="branch">فرع</option><option value="central_workshop">ورشة مركزية</option></select></label>
    {initialBranch ? <label className="branch-field"><span>الحالة <b>*</b></span><select value={values.status} onChange={(event) => update("status", event.target.value as BranchStatus)}><option value="active">نشط</option><option value="temporarily_closed">مغلق مؤقتًا</option><option value="inactive">غير نشط</option></select></label> : null}
    {initialBranch && initialBranch.status !== values.status ? <label className="branch-field"><span>سبب تغيير الحالة <b>*</b></span><textarea rows={2} value={values.statusReason} onChange={(event) => update("statusReason", event.target.value)} aria-invalid={Boolean(errors.statusReason)} />{errors.statusReason ? <small role="alert">{errors.statusReason}</small> : null}</label> : null}
    <label className="branch-field"><span>المدينة <b>*</b></span><input value={values.city} onChange={(event) => update("city", event.target.value)} aria-invalid={Boolean(errors.city)} />{errors.city ? <small role="alert">{errors.city}</small> : null}</label>
    <div className="branch-form__actions"><Button type="submit" variant="primary" icon={<Save aria-hidden size={17} />} disabled={offline || Boolean(duplicate)}>حفظ الموقع</Button><Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button></div>
  </form>;
}
