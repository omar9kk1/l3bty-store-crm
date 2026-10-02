"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Plus } from "lucide-react";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { toBranchOption } from "@/mock-data/branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { QuickCustomerForm } from "@/features/customers/forms/QuickCustomerForm";
import { createCustomer } from "@/features/customers/services/customer-store";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useRentals } from "../hooks/use-rentals";
import { hasOpenCollectionShift, startRental } from "../services/rental-store";
import { resolveDurationMinutes, calculateFixedAmount, DEFAULT_RENTAL_PRICE_PER_HOUR } from "../services/rental-rules";
import { validateNewRental } from "../schemas/rental-schema";
import type { NewRentalInput, RentalDurationType } from "../types";
import { durationLabels, money } from "../components/rental-labels";

const steps = ["العميل", "الأصل", "المدة والسعر", "الوردية والتحصيل", "المراجعة", "بدء التأجير"];

export function NewRentalWizard({ offline = false }: { offline?: boolean }) {
  const router = useRouter();
  const { roles, activeBranch } = useShell();
  const branches = useBranches();
  const customers = useCustomers();
  const employees = useEmployees();
  const { assets, rentals } = useRentals();
  const employee = resolvePreviewEmployee(roles, employees);
  const branchId = activeBranch.id === "all" ? employee.primaryBranchId : activeBranch.id;
  const [step, setStep] = useState(0);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [values, setValues] = useState<NewRentalInput>({
    customerId: "",
    assetId: "",
    branchId,
    employeeId: employee.id,
    durationType: "fixed_30",
    customMinutes: 30,
    pricePerHour: DEFAULT_RENTAL_PRICE_PER_HOUR,
    paidAmount: 0,
    paymentMethod: "cash",
    hasOpenShift: hasOpenCollectionShift(branchId),
  });
  const available = assets.filter((asset) => asset.branchId === values.branchId && asset.status === "available" && !rentals.some((rental) => rental.assetId === asset.id && ["active", "near_end", "additional_time"].includes(rental.status)));
  const minutes = resolveDurationMinutes(values.durationType, values.customMinutes);
  const amount = minutes === null ? 0 : calculateFixedAmount(minutes, values.pricePerHour);

  function next() {
    const result = validateNewRental(values);
    if (step === 0 && !values.customerId) { setNotice("العميل إلزامي."); return; }
    if (step === 1 && !values.assetId) { setNotice("اختر أصلًا متاحًا."); return; }
    if (step === 3 && !result.valid) { setNotice(Object.values(result.errors)[0]); return; }
    if (step === 3 && values.durationType !== "open_time" && values.paidAmount < amount) { setNotice("يجب تحصيل قيمة التأجير كاملة قبل بدء اللعب."); return; }
    setNotice("");
    setStep(Math.min(5, step + 1));
  }

  function begin() {
    const result = startRental(values);
    setNotice(result.message);
    if (result.valid && result.rental) router.replace(values.durationType === "open_time" ? `/rentals/${result.rental.id}` : `/rentals/${result.rental.id}?receipt=ready`);
  }

  return <div className="rental-wizard">
    <ol>{steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={index < step ? "done" : ""}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol>
    {notice ? <div className="rental-notice" role="alert">{notice}</div> : null}
    <Card className="rental-wizard__panel">
      {step === 0 ? <section><h2>اختيار العميل</h2><p>العميل مطلوب لكل عملية تأجير.</p><label><span>العميل *</span><select value={values.customerId} onChange={(event) => setValues({ ...values, customerId: event.target.value })}><option value="">اختر العميل</option>{customers.filter((customer) => customer.status === "active" && !customer.deletedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.primaryPhone}</option>)}</select></label><Button icon={<Plus size={16} />} onClick={() => setCustomerOpen(true)}>إضافة عميل سريعًا</Button></section> : null}
      {step === 1 ? <section><h2>اختيار أصل التأجير</h2><p>مرحلة الاختيار والتجربة مجانية، ولا يبدأ الحساب قبل التأكيد النهائي.</p><div className="rental-choice-grid">{available.map((asset) => <button key={asset.id} type="button" aria-pressed={values.assetId === asset.id} onClick={() => setValues({ ...values, assetId: asset.id })}><strong>{asset.name}</strong><span>رقم اللعبة: <bdi dir="ltr">{asset.barcode}</bdi> · متاح</span></button>)}</div>{!available.length ? <p>لا توجد أصول متاحة في الفرع.</p> : null}</section> : null}
      {step === 2 ? <section><h2>المدة والسعر</h2><div className="rental-choice-grid">{Object.entries(durationLabels).map(([key, label]) => <button key={key} type="button" aria-pressed={values.durationType === key} onClick={() => setValues({ ...values, durationType: key as RentalDurationType, paidAmount: key === "open_time" ? 0 : values.paidAmount })}>{label}</button>)}</div>{values.durationType === "custom" ? <label><span>الدقائق المخصصة</span><input type="number" min="15" value={values.customMinutes} onChange={(event) => setValues({ ...values, customMinutes: Number(event.target.value) })} /></label> : null}<label><span>السعر لكل 15 دقيقة — ج.م</span><input type="number" min="1" value={values.pricePerHour / 4} onChange={(event) => setValues({ ...values, pricePerHour: Number(event.target.value) * 4 })} /></label><p>القيمة المبدئية: <strong>{values.durationType === "open_time" ? "تحسب بالثواني الفعلية" : money(amount)}</strong></p></section> : null}
      {step === 3 ? <section><h2>الوردية والتحصيل</h2><dl><div><dt>الفرع</dt><dd>{branches.find((branch) => branch.id === values.branchId)?.name}</dd></div><div><dt>الوردية المالية</dt><dd>{values.hasOpenShift ? "مفتوحة" : "غير متاحة"}</dd></div></dl><label><span>طريقة التحصيل</span><select value={values.paymentMethod} onChange={(event) => setValues({ ...values, paymentMethod: event.target.value as NewRentalInput["paymentMethod"] })}><option value="cash">نقدي</option><option value="card">بطاقة</option><option value="wallet">محفظة</option></select></label>{values.durationType === "open_time" ? <p className="selection-free-note">الدفع والفاتورة بعد إنهاء الوقت المفتوح وحساب الإجمالي.</p> : <><label><span>المبلغ المستلم قبل اللعب</span><input type="number" min={amount} value={values.paidAmount} onChange={(event) => setValues({ ...values, paidAmount: Number(event.target.value) })} /></label><p className="selection-free-note">الباقي للعميل: <strong>{money(Math.max(0, values.paidAmount - amount))}</strong></p></>}</section> : null}
      {step === 4 ? <section><h2>المراجعة النهائية</h2><dl><div><dt>العميل</dt><dd>{customers.find((customer) => customer.id === values.customerId)?.name}</dd></div><div><dt>اللعبة</dt><dd>{assets.find((asset) => asset.id === values.assetId)?.name} · رقم اللعبة <bdi dir="ltr">{assets.find((asset) => asset.id === values.assetId)?.barcode}</bdi></dd></div><div><dt>المدة</dt><dd>{durationLabels[values.durationType]}</dd></div><div><dt>المبلغ المبدئي</dt><dd>{values.durationType === "open_time" ? "حسب الثواني" : money(amount)}</dd></div></dl><p className="selection-free-note">وقت الاختيار السابق لا يدخل ضمن الوقت أو المبلغ.</p></section> : null}
      {step === 5 ? <section><h2>تأكيد بدء التأجير</h2><p>{values.durationType === "open_time" ? "سيبدأ العداد الآن، ويتم الدفع وإصدار الفاتورة عند الإنهاء." : "بعد تأكيد استلام القيمة تصدر الفاتورة ويبدأ وقت اللعب."}</p><Button size="lg" variant="primary" disabled={offline} onClick={begin}>{values.durationType === "open_time" ? "بدء الوقت المفتوح" : "تأكيد الدفع وإصدار الفاتورة وبدء اللعب"}</Button></section> : null}
    </Card>
    <div className="rental-wizard__actions"><Button disabled={step === 0} onClick={() => setStep(step - 1)}>السابق</Button>{step < 5 ? <Button variant="primary" icon={<ChevronLeft size={16} />} onClick={next}>التالي</Button> : null}</div>
    <Drawer open={customerOpen} onOpenChange={setCustomerOpen} title="إضافة عميل سريعًا" description="أدخل اسم العميل ورقم هاتفه فقط." variant="auxiliary">
      <QuickCustomerForm customers={customers.filter((customer) => !customer.deletedAt)} branches={branches.map(toBranchOption)} offline={offline} fixedBranchId={branchId} essentialFieldsOnly onSave={(form) => { const created = createCustomer(form, "rental"); setValues((current) => ({ ...current, customerId: created.id })); setCustomerOpen(false); }} />
    </Drawer>
  </div>;
}
