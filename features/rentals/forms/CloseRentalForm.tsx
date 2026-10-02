"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RentalAssetCondition } from "@/features/rental-assets/types";
import { money, time } from "../components/rental-labels";
import { useRentals } from "../hooks/use-rentals";
import { closeRental } from "../services/rental-store";
import { calculateRentalLiveAmount, calculateRentalSettlement, currentMockServerIso, currentMockServerMs, MOCK_SERVER_TIME } from "../services/rental-rules";

export function CloseRentalForm({ rentalId }: { rentalId: string }) {
  const router = useRouter(); const { rentals } = useRentals();
  const rental = rentals.find((item) => item.id === rentalId);
  const [condition, setCondition] = useState<RentalAssetCondition>("good"); const [notice, setNotice] = useState(""); const [saving, setSaving] = useState(false);
  const [receivedNow, setReceivedNow] = useState("");
  const [referenceMs, setReferenceMs] = useState(() => new Date(MOCK_SERVER_TIME.referenceIso).getTime());
  useEffect(() => { const timer = window.setInterval(() => setReferenceMs(currentMockServerMs()), 1000); return () => window.clearInterval(timer); }, []);
  const liveAmount = rental ? calculateRentalLiveAmount(rental, referenceMs) : 0;
  if (!rental) return null;
  const settlement = calculateRentalSettlement(liveAmount, rental.paidAmount);
  const receivedAmount = Number(receivedNow) || 0;
  const customerChange = Math.round(Math.max(0, receivedAmount - settlement.amountDue) * 100) / 100;
  function save() {
    if (saving) return;
    setSaving(true);
    const collectNow = settlement.amountDue > 0;
    const result = closeRental(rental!.id, condition, currentMockServerIso(), collectNow ? receivedAmount : 0);
    setNotice(result.message);
    if (!result.valid) { setSaving(false); return; }
    router.push(collectNow ? `/rentals/${rental!.id}?receipt=ready` : `/rentals/${rental!.id}`);
  }
  return <Card className="rental-operation-form"><h2>إنهاء التأجير</h2><ol><li>تثبيت وقت الإنهاء: {time(new Date(referenceMs).toISOString())}</li><li>فحص حالة الأصل عند الإرجاع</li><li>حساب الوقت والمبلغ النهائي</li><li>{settlement.amountDue > 0 ? "تأكيد الدفع وإصدار الفاتورة" : "تأكيد الإنهاء"}</li></ol><dl><div><dt>الإجمالي النهائي</dt><dd>{money(liveAmount)}</dd></div><div><dt>{settlement.amountDue > 0 ? "المطلوب دفعه الآن" : "المدفوع قبل اللعب"}</dt><dd>{money(settlement.amountDue > 0 ? settlement.amountDue : rental.paidAmount)}</dd></div>{settlement.amountDue > 0 ? <div><dt>الباقي للعميل</dt><dd>{money(customerChange)}</dd></div> : null}</dl>{settlement.amountDue > 0 ? <label><span>المبلغ المستلم من العميل</span><input type="number" min={settlement.amountDue} value={receivedNow} onChange={(event) => setReceivedNow(event.target.value)} /></label> : null}<label><span>حالة الأصل</span><select value={condition} onChange={(event) => setCondition(event.target.value as RentalAssetCondition)}><option value="excellent">ممتازة</option><option value="good">جيدة</option><option value="needs_inspection">تحتاج فحصًا</option><option value="damaged">متضررة</option></select></label><p>{settlement.amountDue > 0 ? "بعد تأكيد الدفع سيتم إنهاء التأجير وإظهار الفاتورة." : "تم دفع قيمة التأجير وإصدار فاتورته قبل بدء اللعب."}</p>{notice ? <p role="alert">{notice}</p> : null}<Button variant="primary" onClick={save} disabled={saving || (settlement.amountDue > 0 && receivedAmount < settlement.amountDue)}>{saving ? "جار الحفظ…" : settlement.amountDue > 0 ? "تأكيد الدفع وإنهاء وإصدار الفاتورة" : "إنهاء التأجير"}</Button></Card>;
}
