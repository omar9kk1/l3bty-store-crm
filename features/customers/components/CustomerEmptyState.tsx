import { SearchX, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function CustomerEmptyState({ canCreate, onAdd }: { canCreate: boolean; onAdd: () => void }) {
  return (
    <Card className="customers-state">
      <span className="customers-state__icon"><SearchX aria-hidden /></span>
      <h3>لا يوجد عملاء في النطاق الحالي</h3>
      <p>غيّر البحث أو الفلاتر أو اختر فرعًا آخر من شريط التطبيق.</p>
      {canCreate ? <Button type="button" variant="primary" icon={<UserPlus aria-hidden size={17} />} onClick={onAdd}>إضافة عميل</Button> : null}
    </Card>
  );
}
