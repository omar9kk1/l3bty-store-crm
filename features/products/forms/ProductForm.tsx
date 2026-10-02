"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { Branch } from "@/features/branches/types";
import type { ProductBranchStock, ProductFormValues, SaleProduct } from "../types";
import { saveProduct } from "../services/product-store";

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;

function isStoredImage(value: string) {
  return value.startsWith("data:image/");
}

export function ProductForm({
  product,
  branches,
  stocks = [],
  defaultBranchId,
  onSaved,
  onCancel,
  offline = false,
}: {
  product?: SaleProduct;
  branches: readonly Branch[];
  stocks?: readonly ProductBranchStock[];
  defaultBranchId?: string;
  onSaved: () => void;
  onCancel: () => void;
  offline?: boolean;
}) {
  const saleBranches = branches.filter((branch) => branch.type === "branch");
  const initialBranchId = saleBranches.some((branch) => branch.id === defaultBranchId)
    ? defaultBranchId!
    : saleBranches[0]?.id ?? "";
  const [notice, setNotice] = useState("");
  const [stockBranchId, setStockBranchId] = useState(initialBranchId);
  const [values, setValues] = useState<ProductFormValues>({
    name: product?.name ?? "",
    type: "sale_toy",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    category: product?.category ?? "ألعاب للبيع",
    brand: product?.brand ?? "",
    description: product?.description ?? "",
    salePrice: product?.salePrice ?? 0,
    costSnapshot: product?.costSnapshot ?? 0,
    taxRate: product?.taxRate ?? 0,
    warrantyDays: product?.warrantyDays ?? 0,
    active: product?.active ?? true,
    imageMockKey: product?.imageMockKey ?? "",
    openingStock: Object.fromEntries(saleBranches.map((branch) => [
      branch.id,
      stocks.find((stock) => stock.productId === product?.id && stock.branchId === branch.id)
        ?.quantityAvailable ?? 0,
    ])),
    minimumStock: 1,
  });

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("اختر ملف صورة صالحًا للمنتج.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setNotice("حجم الصورة كبير. اختر صورة لا تتجاوز 1.5 ميجابايت.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("imageMockKey", String(reader.result ?? ""));
      setNotice("");
    };
    reader.onerror = () => setNotice("تعذر قراءة الصورة، حاول اختيارها مرة أخرى.");
    reader.readAsDataURL(file);
  }

  function submit() {
    if (offline) {
      setNotice("الحفظ غير متاح دون اتصال.");
      return;
    }
    const barcode = values.barcode.trim();
    if (!barcode) {
      setNotice("أدخل باركود المنتج.");
      return;
    }
    if (!isStoredImage(values.imageMockKey)) {
      setNotice("أضف صورة واضحة للمنتج.");
      return;
    }
    const result = saveProduct(
      { ...values, type: "sale_toy", sku: barcode, barcode, category: "ألعاب للبيع" },
      product?.id,
    );
    setNotice(result.message);
    if (result.valid) onSaved();
  }

  return (
    <form className="product-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <div className="product-form__grid">
        <label>
          <span>اسم المنتج *</span>
          <input autoFocus value={values.name} onChange={(event) => set("name", event.target.value)} />
        </label>
        <label>
          <span>الباركود *</span>
          <input dir="ltr" value={values.barcode} onChange={(event) => set("barcode", event.target.value)} />
        </label>
        <label>
          <span>سعر الشراء *</span>
          <input type="number" min="0" step="0.01" value={values.costSnapshot} onChange={(event) => set("costSnapshot", Number(event.target.value))} />
        </label>
        <label>
          <span>سعر البيع *</span>
          <input type="number" min="0" step="0.01" value={values.salePrice} onChange={(event) => set("salePrice", Number(event.target.value))} />
        </label>
        <label>
          <span>الفرع المتاح فيه المنتج *</span>
          <select value={stockBranchId} onChange={(event) => setStockBranchId(event.target.value)}>
            {saleBranches.map((branch) => (
              <option value={branch.id} key={branch.id}>{branch.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{product ? "الكمية المتاحة حاليًا *" : "الكمية المتاحة عند الإضافة *"}</span>
          <input
            type="number"
            min="0"
            step="1"
            value={values.openingStock[stockBranchId] ?? 0}
            onChange={(event) => set("openingStock", {
              ...values.openingStock,
              [stockBranchId]: Math.max(0, Math.floor(Number(event.target.value) || 0)),
            })}
          />
          <small>إذا كانت الكمية صفرًا سيظهر المنتج «غير متوفر» في نقطة البيع.</small>
        </label>
        <label className="product-form__image-field">
          <span>صورة المنتج *</span>
          <input type="file" accept="image/*" onChange={selectImage} />
          <small>ستظهر هذه الصورة في كارت المنتج عند موظف البيع.</small>
        </label>
        {isStoredImage(values.imageMockKey) ? (
          <div className="product-form__image-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={values.imageMockKey} alt={`معاينة ${values.name || "المنتج"}`} />
            <Button type="button" variant="ghost" onClick={() => set("imageMockKey", "")}>تغيير الصورة</Button>
          </div>
        ) : null}
      </div>
      {notice ? <p role="alert">{notice}</p> : null}
      <div className="product-form__actions">
        <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" variant="primary" disabled={offline}>حفظ المنتج</Button>
      </div>
    </form>
  );
}
