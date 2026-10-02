"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import type { Branch } from "@/features/branches/types";
import { createRentalAsset } from "@/features/rentals/services/rental-store";

export function RentalAssetCreateAction({ branches }: { branches: readonly Branch[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const barcode = String(data.get("barcode"));
    const result = createRentalAsset({
      name: String(data.get("name")),
      assetNumber: barcode,
      barcode,
      category: String(data.get("category")),
      branchId: String(data.get("branchId")),
      purchaseDate: "",
      purchaseCost: 0,
      notes: "",
    });
    setMessage(result.message);
    if (result.valid) {
      form.reset();
      setOpen(false);
    }
  }

  return <div className="rental-asset-create-action">
    <Button variant="primary" onClick={() => setOpen(true)} disabled={!branches.length}>إضافة لعبة تأجير</Button>
    {message ? <p className="rental-asset-create-message" role="status">{message}</p> : null}
    <Drawer open={open} onOpenChange={setOpen} title="إضافة لعبة تأجير" description="ستظهر اللعبة فورًا في التأجير وعند عرض الصفحة كمالك." variant="auxiliary">
      <form className="finance-form" onSubmit={submit}>
        <label>اسم اللعبة<input name="name" required minLength={2} /></label>
        <label>رقم اللعبة (الباركود)<input aria-label="رقم اللعبة (الباركود)" name="barcode" required placeholder="مثال: GAME-1001" dir="ltr" /><small>اكتب الكود الموجود على ملصق اللعبة.</small></label>
        <label>التصنيف<input name="category" defaultValue="ألعاب تأجير" /></label>
        <label>الفرع<select name="branchId" required><option value="">اختر الفرع</option>{branches.filter((branch) => branch.status === "active" && branch.type === "branch").map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>
        <Button type="submit" variant="primary">حفظ اللعبة</Button>
      </form>
    </Drawer>
  </div>;
}
