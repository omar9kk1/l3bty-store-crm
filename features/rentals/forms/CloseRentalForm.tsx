"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RentalAssetCondition } from "@/features/rental-assets/types";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { money, time } from "../components/rental-labels";
import { RentalWhatsAppAction } from "../components/RentalWhatsAppAction";
import { useRentals } from "../hooks/use-rentals";
import { closeRental } from "../services/rental-store";
import { calculateOpenAmount, currentMockServerIso, currentMockServerMs, MOCK_SERVER_TIME } from "../services/rental-rules";

export function CloseRentalForm({ rentalId }: { rentalId: string }) {
  const router = useRouter(); const { rentals, assets } = useRentals(); const customers = useCustomers(); const branches = useBranches();
  const rental = rentals.find((item) => item.id === rentalId); const asset = rental ? assets.find((item) => item.id === rental.assetId) : undefined;
  const customer = rental ? customers.find((item) => item.id === rental.customerId) : undefined; const branch = rental ? branches.find((item) => item.id === rental.branchId) : undefined;
  const [condition, setCondition] = useState<RentalAssetCondition>("good"); const [notice, setNotice] = useState(""); const [saving, setSaving] = useState(false);
  const [referenceMs, setReferenceMs] = useState(() => new Date(MOCK_SERVER_TIME.referenceIso).getTime());
  useEffect(() => { const timer = window.setInterval(() => setReferenceMs(currentMockServerMs()), 1000); return () => window.clearInterval(timer); }, []);
  const liveSeconds = rental?.durationType === "open_time" && rental.startedAt ? Math.max(0, Math.floor((referenceMs - new Date(rental.startedAt).getTime()) / 1000)) : 0;
  const liveAmount = rental?.durationType === "open_time" ? calculateOpenAmount(liveSeconds, rental.pricePerHour) : rental?.currentAmount ?? 0;
  if (!rental) return null;
  function save() {
    if (saving) return;
    setSaving(true);
    const result = closeRental(rental!.id, condition, currentMockServerIso());
    setNotice(result.message);
    if (!result.valid) { setSaving(false); return; }
    router.push(`/rentals/${rental!.id}`);
  }
  return <Card className="rental-operation-form"><h2>إنهاء التأجير</h2><ol><li>تثبيت وقت الإنهاء: {time(new Date(referenceMs).toISOString())}</li><li>فحص حالة الأصل عند الإرجاع</li><li>حساب الوقت والمبلغ النهائي</li><li>مراجعة المدفوع والمتبقي</li><li>تأكيد التحصيل والإيصال</li></ol><dl><div><dt>القيمة الحالية</dt><dd>{money(liveAmount)}</dd></div><div><dt>المدفوع</dt><dd>{money(rental.paidAmount)}</dd></div><div><dt>المتبقي</dt><dd>{money(Math.max(0, liveAmount - rental.paidAmount))}</dd></div></dl><label><span>حالة الأصل</span><select value={condition} onChange={(event) => setCondition(event.target.value as RentalAssetCondition)}><option value="excellent">ممتازة</option><option value="good">جيدة</option><option value="needs_inspection">تحتاج فحصًا</option><option value="damaged">متضررة</option></select></label>{asset && customer && branch ? <div className="rental-operation-form__invoice"><span>يمكن فتح فاتورة التأجير الجاهزة على واتساب قبل أو بعد تأكيد الإنهاء.</span><RentalWhatsAppAction rental={rental} asset={asset} customer={customer} branch={branch} kind="invoice" /></div> : null}{notice ? <p role="alert">{notice}</p> : null}<Button variant="primary" onClick={save} disabled={saving}>{saving ? "جار الحفظ…" : "تأكيد الإنهاء وإصدار الإيصال"}</Button></Card>;
}
