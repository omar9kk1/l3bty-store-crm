"use client";

import Link from "next/link";
import { AlertCircle, Building2, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { BRANCH_MANAGER_FIXTURES } from "../fixtures";
import { EMPTY_BRANCH_FORM, validateBranchForm } from "../schemas/branch-schema";
import type { Branch, BranchFormErrors, BranchFormValues, BranchStatus, BranchType } from "../types";

function branchToForm(branch?: Branch): BranchFormValues {
  if (!branch) return { ...EMPTY_BRANCH_FORM };
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
  const initialValues = useMemo(() => branchToForm(initialBranch), [initialBranch]);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<BranchFormErrors>({});
  const [duplicate, setDuplicate] = useState<Branch>();
  function update<K extends keyof BranchFormValues>(key: K, value: BranchFormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (key === "code") {
      const result = validateBranchForm(next, branches, initialBranch);
      setDuplicate(result.duplicate);
      setErrors((current) => ({ ...current, code: result.errors.code }));
    } else if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
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
    <label className="branch-field"><span>كود الفرع <b>*</b></span><input value={values.code} onChange={(event) => update("code", event.target.value)} dir="ltr" autoCapitalize="characters" aria-invalid={Boolean(errors.code)} placeholder="BR04" />{errors.code ? <small role="alert">{errors.code}</small> : null}</label>
    {duplicate ? <div className="branch-duplicate" role="alert"><Building2 aria-hidden size={20} /><div><strong>الكود مستخدم بالفعل</strong><span>{duplicate.name} · {duplicate.code}</span><Link href={`/branches/${duplicate.id}`}>فتح الموقع الموجود</Link></div></div> : null}
    <div className="branch-form__split"><label className="branch-field"><span>نوع الموقع <b>*</b></span><select value={values.type} onChange={(event) => update("type", event.target.value as BranchType)}><option value="branch">فرع</option><option value="central_workshop">ورشة مركزية</option></select></label><label className="branch-field"><span>الحالة <b>*</b></span><select value={values.status} onChange={(event) => update("status", event.target.value as BranchStatus)}><option value="active">نشط</option><option value="temporarily_closed">مغلق مؤقتًا</option><option value="inactive">غير نشط</option></select></label></div>
    {initialBranch && initialBranch.status !== values.status ? <label className="branch-field"><span>سبب تغيير الحالة <b>*</b></span><textarea rows={2} value={values.statusReason} onChange={(event) => update("statusReason", event.target.value)} aria-invalid={Boolean(errors.statusReason)} />{errors.statusReason ? <small role="alert">{errors.statusReason}</small> : null}</label> : null}
    <div className="branch-form__split"><label className="branch-field"><span>الهاتف</span><input value={values.phone} onChange={(event) => update("phone", event.target.value)} dir="ltr" inputMode="tel" /></label><label className="branch-field"><span>رقم بديل</span><input value={values.alternatePhone} onChange={(event) => update("alternatePhone", event.target.value)} dir="ltr" inputMode="tel" /></label></div>
    <div className="branch-form__split"><label className="branch-field"><span>المدينة <b>*</b></span><input value={values.city} onChange={(event) => update("city", event.target.value)} aria-invalid={Boolean(errors.city)} />{errors.city ? <small role="alert">{errors.city}</small> : null}</label><label className="branch-field"><span>المنطقة <b>*</b></span><input value={values.area} onChange={(event) => update("area", event.target.value)} aria-invalid={Boolean(errors.area)} />{errors.area ? <small role="alert">{errors.area}</small> : null}</label></div>
    <label className="branch-field"><span>العنوان التفصيلي <b>*</b></span><textarea rows={3} value={values.address} onChange={(event) => update("address", event.target.value)} aria-invalid={Boolean(errors.address)} />{errors.address ? <small role="alert">{errors.address}</small> : null}</label>
    <label className="branch-field"><span>مدير الموقع <b>*</b></span><select value={values.managerEmployeeId} onChange={(event) => update("managerEmployeeId", event.target.value)} aria-invalid={Boolean(errors.managerEmployeeId)}><option value="">اختر مديرًا تجريبيًا</option>{BRANCH_MANAGER_FIXTURES.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select>{errors.managerEmployeeId ? <small role="alert">{errors.managerEmployeeId}</small> : null}</label>
    <div className="branch-form__split"><label className="branch-field"><span>خط العرض <b>*</b></span><input type="number" step="any" value={values.latitude} onChange={(event) => update("latitude", event.target.value)} dir="ltr" aria-invalid={Boolean(errors.latitude)} />{errors.latitude ? <small role="alert">{errors.latitude}</small> : null}</label><label className="branch-field"><span>خط الطول <b>*</b></span><input type="number" step="any" value={values.longitude} onChange={(event) => update("longitude", event.target.value)} dir="ltr" aria-invalid={Boolean(errors.longitude)} />{errors.longitude ? <small role="alert">{errors.longitude}</small> : null}</label></div>
    <label className="branch-field"><span>نطاق الحضور بالمتر <b>*</b></span><input type="number" min="25" max="2000" value={values.geofenceRadiusMeters} onChange={(event) => update("geofenceRadiusMeters", event.target.value)} dir="ltr" aria-invalid={Boolean(errors.geofenceRadiusMeters)} />{errors.geofenceRadiusMeters ? <small role="alert">{errors.geofenceRadiusMeters}</small> : null}</label>
    <div className="branch-form__split"><label className="branch-field"><span>وقت الفتح <b>*</b></span><input type="time" value={values.opensAt} onChange={(event) => update("opensAt", event.target.value)} aria-invalid={Boolean(errors.opensAt)} />{errors.opensAt ? <small role="alert">{errors.opensAt}</small> : null}</label><label className="branch-field"><span>وقت الإغلاق <b>*</b></span><input type="time" value={values.closesAt} onChange={(event) => update("closesAt", event.target.value)} aria-invalid={Boolean(errors.closesAt)} />{errors.closesAt ? <small role="alert">{errors.closesAt}</small> : null}</label></div>
    <label className="branch-checkbox"><input type="checkbox" checked={values.crossesMidnight} onChange={(event) => update("crossesMidnight", event.target.checked)} /><span>الموعد يعبر منتصف الليل</span></label>
    <label className="branch-field"><span>ملاحظات</span><textarea rows={3} value={values.notes} onChange={(event) => update("notes", event.target.value)} /></label>
    <div className="branch-form__actions"><Button type="submit" variant="primary" icon={<Save aria-hidden size={17} />} disabled={offline || Boolean(duplicate)}>حفظ الموقع</Button><Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button></div>
  </form>;
}
