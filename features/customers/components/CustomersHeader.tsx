import { Filter, Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CustomersHeaderProps {
  canCreate: boolean;
  offline: boolean;
  onAdd: () => void;
  onOpenFilters: () => void;
}

export function CustomersHeader({ canCreate, offline, onAdd, onOpenFilters }: CustomersHeaderProps) {
  return (
    <header className="customers-heading">
      <div className="customers-heading__copy">
        <span className="customers-eyebrow"><UsersRound aria-hidden size={15} /> سجل العملاء</span>
        <h2>العملاء</h2>
        <p>ابحث في ملفات العملاء وتابع الأنشطة المتاحة حسب دورك والفرع الحالي.</p>
      </div>
      <div className="customers-heading__actions">
        <Button type="button" icon={<Filter aria-hidden size={17} />} onClick={onOpenFilters}>الفلاتر</Button>
        {canCreate ? <Button type="button" variant="primary" icon={<Plus aria-hidden size={18} />} onClick={onAdd} disabled={offline}>إضافة عميل</Button> : null}
      </div>
    </header>
  );
}
