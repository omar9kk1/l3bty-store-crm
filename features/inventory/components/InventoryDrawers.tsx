"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import type { BranchOption } from "@/features/branches/types";
import { StockAdjustmentForm } from "../forms/StockAdjustmentForm";
import type { StockBalance } from "../types";

interface InventoryDrawersProps {
  supplyOpen: boolean;
  onSupplyOpenChange: (open: boolean) => void;
  onSubmitSupply: (event: FormEvent<HTMLFormElement>) => void;
  restockOpen: boolean;
  onRestockOpenChange: (open: boolean) => void;
  onSubmitRestock: (event: FormEvent<HTMLFormElement>) => void;
  adjustOpen: boolean;
  onAdjustOpenChange: (open: boolean) => void;
  balances: readonly StockBalance[];
  branches: readonly BranchOption[];
}

export function InventoryDrawers({
  supplyOpen,
  onSupplyOpenChange,
  onSubmitSupply,
  restockOpen,
  onRestockOpenChange,
  onSubmitRestock,
  adjustOpen,
  onAdjustOpenChange,
  balances,
  branches,
}: InventoryDrawersProps) {
  return (
    <>
      <Drawer
        open={supplyOpen}
        onOpenChange={onSupplyOpenChange}
        title="إضافة قطعة إلى المخزن"
        description="اكتب اسم القطعة والكمية؛ ستضاف فورًا إلى مخزون الورشة بحركة موثقة."
        variant="auxiliary"
      >
        <form className="inventory-tool-form" onSubmit={onSubmitSupply}>
          <label>
            قطعة الغيار
            <input
              name="partName"
              required
              autoComplete="off"
              placeholder="اكتب اسم قطعة الغيار"
            />
          </label>
          <label>
            الكمية
            <input
              name="quantity"
              type="number"
              min="1"
              step="1"
              defaultValue="1"
              required
            />
          </label>
          <label>
            مصدر القطع
            <select name="source" defaultValue="technician_purchase">
              <option value="technician_purchase">اشتراها الفني</option>
              <option value="technician_brought">أحضرها الفني</option>
              <option value="supplier_delivery">توريد من مورد</option>
              <option value="other">مصدر آخر</option>
            </select>
          </label>
          <label>
            رقم فاتورة أو مرجع
            <input name="reference" placeholder="اختياري إذا كتبت ملاحظة" />
          </label>
          <label>
            ملاحظات
            <textarea
              name="notes"
              placeholder="من أين جاءت القطع وأي تفاصيل مهمة"
            />
          </label>
          <Button type="submit" variant="primary">
            إضافة القطعة إلى المخزن
          </Button>
        </form>
      </Drawer>

      <Drawer
        open={restockOpen}
        onOpenChange={onRestockOpenChange}
        title="طلب تزويد قطع غيار"
        description="أرسل للمالك والمديرين القطعة الناقصة والكمية المطلوبة والأولوية."
        variant="auxiliary"
      >
        <form className="inventory-tool-form" onSubmit={onSubmitRestock}>
          <label>
            قطعة الغيار
            <input
              name="partName"
              required
              autoComplete="off"
              placeholder="اكتب اسم قطعة الغيار"
            />
          </label>
          <label>
            الكمية المطلوبة
            <input
              name="quantity"
              type="number"
              min="1"
              step="1"
              defaultValue="1"
              required
            />
          </label>
          <label>
            الأولوية
            <select name="priority" defaultValue="normal">
              <option value="normal">عادية</option>
              <option value="high">مرتفعة</option>
              <option value="urgent">عاجلة</option>
            </select>
          </label>
          <label>
            سبب الاحتياج
            <textarea
              name="reason"
              required
              placeholder="مثال: الرصيد المتبقي لا يكفي للصيانات الحالية"
            />
          </label>
          <Button type="submit" variant="primary">
            إرسال الطلب للمديرين
          </Button>
        </form>
      </Drawer>

      <Drawer
        open={adjustOpen}
        onOpenChange={onAdjustOpenChange}
        title="جرد وتسوية مخزون"
        description="قارن الكمية المسجلة بالكمية الموجودة فعليًا، ثم وثّق سبب الفرق."
        variant="auxiliary"
      >
        <StockAdjustmentForm
          balances={balances}
          branches={branches}
          onDone={() => onAdjustOpenChange(false)}
        />
      </Drawer>
    </>
  );
}
