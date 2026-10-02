"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { BranchOption } from "@/features/branches/types";
import { useProducts } from "@/features/products/hooks/use-products";
import {
  inventoryAdjustmentDifferenceLabel,
  inventoryBranchLabel,
} from "../components/inventory-labels";
import { adjustStock } from "../services/inventory-service";
import type { StockBalance } from "../types";

interface StockAdjustmentFormProps {
  balances: readonly StockBalance[];
  branches: readonly BranchOption[];
  onDone: () => void;
}

export function StockAdjustmentForm({
  balances,
  branches,
  onDone,
}: StockAdjustmentFormProps) {
  const { products } = useProducts();
  const [productId, setProductId] = useState(balances[0]?.productId ?? "");
  const [branchId, setBranchId] = useState(balances[0]?.branchId ?? "");
  const [actualQuantity, setActualQuantity] = useState("");
  const [message, setMessage] = useState("");

  const productIds = useMemo(
    () => new Set(balances.map((balance) => balance.productId)),
    [balances],
  );
  const availableProducts = products.filter(
    (product) => product.active && productIds.has(product.id),
  );
  const productBalances = balances.filter(
    (balance) => balance.productId === productId,
  );
  const selectedBalance = productBalances.find(
    (balance) => balance.branchId === branchId,
  );
  const parsedActualQuantity =
    actualQuantity === "" ? null : Number(actualQuantity);
  const difference =
    selectedBalance &&
    parsedActualQuantity !== null &&
    Number.isInteger(parsedActualQuantity) &&
    parsedActualQuantity >= 0
      ? parsedActualQuantity - selectedBalance.quantityOnHand
      : null;

  function selectProduct(nextProductId: string) {
    setProductId(nextProductId);
    setBranchId(
      balances.find((balance) => balance.productId === nextProductId)
        ?.branchId ?? "",
    );
    setActualQuantity("");
    setMessage("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = adjustStock({
      productId,
      branchId,
      actualQuantity: Number(data.get("actualQuantity")),
      reason: String(data.get("reason")),
      notes: "",
      performedByEmployeeId: "employee-manager",
      idempotencyKey: `count-${productId}-${branchId}-${data.get("actualQuantity")}`,
    });
    setMessage(result.message);
    if (result.valid) onDone();
  }

  if (!availableProducts.length) {
    return <p className="inventory-adjustment-empty">لا توجد أصناف مسجلة يمكن جردها.</p>;
  }

  return (
    <form className="inventory-form inventory-adjustment-form" onSubmit={submit}>
      <label>
        المنتج
        <select
          name="productId"
          value={productId}
          onChange={(event) => selectProduct(event.target.value)}
          required
        >
          {availableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        الفرع
        <select
          name="branchId"
          value={branchId}
          onChange={(event) => {
            setBranchId(event.target.value);
            setActualQuantity("");
            setMessage("");
          }}
          required
        >
          {productBalances.map((balance) => (
            <option key={balance.branchId} value={balance.branchId}>
              {inventoryBranchLabel(balance.branchId, branches)}
            </option>
          ))}
        </select>
      </label>
      <div className="inventory-adjustment-summary">
        <label>
          الكمية المسجلة
          <input
            value={selectedBalance?.quantityOnHand ?? ""}
            readOnly
            aria-readonly="true"
          />
        </label>
        <label>
          الكمية الفعلية
          <input
            name="actualQuantity"
            type="number"
            min="0"
            step="1"
            value={actualQuantity}
            onChange={(event) => {
              setActualQuantity(event.target.value);
              setMessage("");
            }}
            required
          />
        </label>
      </div>
      <div className="inventory-adjustment-difference" aria-live="polite">
        <span>الفرق</span>
        <output>{inventoryAdjustmentDifferenceLabel(difference)}</output>
      </div>
      <label>
        سبب الفرق
        <textarea
          name="reason"
          required
          placeholder="مثال: كسر، فقد أو خطأ في العد السابق"
        />
      </label>
      {message ? <p role="status">{message}</p> : null}
      <Button
        type="submit"
        variant="primary"
        disabled={!selectedBalance || difference === null || difference === 0}
      >
        تأكيد تسوية المخزون
      </Button>
    </form>
  );
}
