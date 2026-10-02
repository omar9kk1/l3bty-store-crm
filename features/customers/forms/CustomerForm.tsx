"use client";

import { AlertCircle, Save, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { BranchOption } from "@/features/branches/types";
import { EMPTY_CUSTOMER_FORM, validateCustomerForm } from "../schemas/customer-schema";
import type { Customer, CustomerFormValues } from "../types";

interface CustomerFormProps {
  customers: readonly Customer[];
  branches: readonly BranchOption[];
  initialCustomer?: Customer;
  offline?: boolean;
  submitLabel?: string;
  fixedBranchId?: string;
  essentialFieldsOnly?: boolean;
  onCancel?: () => void;
  onSave: (values: CustomerFormValues) => void;
}

export function CustomerForm({
  customers,
  branches,
  initialCustomer,
  offline = false,
  submitLabel = "حفظ العميل",
  fixedBranchId,
  essentialFieldsOnly = false,
  onCancel,
  onSave,
}: CustomerFormProps) {
  const initialValues = useMemo<CustomerFormValues>(() => initialCustomer ? {
    name: initialCustomer.name,
    primaryPhone: initialCustomer.primaryPhone,
    alternatePhone: initialCustomer.alternatePhones[0] ?? "",
    branchId: fixedBranchId ?? initialCustomer.branchIds[0] ?? "",
    notes: "",
  } : {
    ...EMPTY_CUSTOMER_FORM,
    branchId: fixedBranchId ?? branches.find((branch) => branch.id !== "all")?.id ?? "",
  }, [branches, fixedBranchId, initialCustomer]);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ReturnType<typeof validateCustomerForm>["errors"]>({});
  const [duplicate, setDuplicate] = useState<Customer>();

  function update(key: keyof CustomerFormValues, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (key === "primaryPhone" || key === "alternatePhone") {
      const result = validateCustomerForm(next, customers, initialCustomer?.id);
      setDuplicate(result.duplicate);
      setErrors((current) => ({ ...current, [key]: result.errors[key] }));
    } else if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const submittedValues = essentialFieldsOnly
      ? { ...values, alternatePhone: "", branchId: fixedBranchId ?? values.branchId, notes: "" }
      : values;
    const result = validateCustomerForm(submittedValues, customers, initialCustomer?.id);
    setErrors(result.errors);
    setDuplicate(result.duplicate);
    if (!result.valid || offline) return;
    onSave(result.normalizedValues);
  }

  return (
    <form className="customer-form" onSubmit={submit} noValidate>
      {offline ? <div className="customer-form__notice" role="status"><AlertCircle aria-hidden size={17} /><span>الحفظ يحتاج اتصالًا. يمكنك مراجعة البيانات فقط الآن.</span></div> : null}
      <label className="customer-field"><span>اسم العميل <b aria-hidden>*</b></span><input value={values.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" aria-invalid={Boolean(errors.name)} />{errors.name ? <small role="alert">{errors.name}</small> : null}</label>
      <label className="customer-field"><span>رقم الهاتف الأساسي <b aria-hidden>*</b></span><input value={values.primaryPhone} onChange={(event) => update("primaryPhone", event.target.value)} inputMode="tel" dir="ltr" autoComplete="tel" aria-invalid={Boolean(errors.primaryPhone)} placeholder="01XXXXXXXXX" />{errors.primaryPhone ? <small role="alert">{errors.primaryPhone}</small> : null}</label>
      {duplicate ? <div className="customer-duplicate" role="alert"><UserRound aria-hidden size={20} /><div><strong>الرقم مسجل بالفعل</strong><span>{duplicate.name} · {duplicate.customerNumber}</span><span>اختر العميل المسجل بدل إضافته مرة أخرى.</span></div></div> : null}
      {!essentialFieldsOnly ? <label className="customer-field"><span>رقم بديل <em>اختياري</em></span><input value={values.alternatePhone} onChange={(event) => update("alternatePhone", event.target.value)} inputMode="tel" dir="ltr" aria-invalid={Boolean(errors.alternatePhone)} placeholder="01XXXXXXXXX" />{errors.alternatePhone ? <small role="alert">{errors.alternatePhone}</small> : null}</label> : null}
      {!fixedBranchId ? <label className="customer-field"><span>الفرع <b aria-hidden>*</b></span><select value={values.branchId} onChange={(event) => update("branchId", event.target.value)} aria-invalid={Boolean(errors.branchId)}><option value="">اختر الفرع</option>{branches.filter((branch) => branch.id !== "all").map((branch) => <option key={branch.id} value={branch.id}>{branch.nameAr}</option>)}</select>{errors.branchId ? <small role="alert">{errors.branchId}</small> : null}</label> : null}
      {!essentialFieldsOnly ? <label className="customer-field"><span>ملاحظات مختصرة <em>اختياري</em></span><textarea value={values.notes} onChange={(event) => update("notes", event.target.value)} rows={3} maxLength={240} /></label> : null}
      <div className="customer-form__actions">
        <Button type="submit" variant="primary" icon={<Save aria-hidden size={17} />} disabled={offline || Boolean(duplicate)}>{submitLabel}</Button>
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button> : null}
      </div>
    </form>
  );
}
