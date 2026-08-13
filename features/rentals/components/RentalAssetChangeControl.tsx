"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { RentalAsset } from "@/features/rental-assets/types";
import type { Rental } from "../types";
import { changeRentalAsset } from "../services/rental-store";

const liveStatuses = ["active", "near_end", "additional_time"];

export function RentalAssetChangeControl({ rental, assets }: { rental: Rental; assets: readonly RentalAsset[] }) {
  const [open, setOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [notice, setNotice] = useState("");
  const availableAssets = assets.filter((asset) =>
    asset.branchId === rental.branchId
    && asset.status === "available"
    && !asset.currentRentalId
    && asset.id !== rental.assetId,
  );

  if (!liveStatuses.includes(rental.status)) return null;

  function save() {
    const result = changeRentalAsset(rental.id, selectedAssetId, "المستخدم الحالي");
    setNotice(result.message);
    if (result.valid) {
      setSelectedAssetId("");
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        disabled={!availableAssets.length}
        title={!availableAssets.length ? "لا توجد لعبة متاحة في نفس الفرع" : "يكمل التأجير بنفس الوقت والسعر"}
        onClick={() => { setNotice(""); setOpen((value) => !value); }}
      >
        تغيير اللعبة
      </Button>
      {notice ? <div className="rental-notice" role="status" style={{ flexBasis: "100%" }}>{notice}</div> : null}
      {open ? (
        <div
          role="region"
          aria-label="تغيير اللعبة مع استمرار الوقت"
          style={{ display: "grid", gap: "var(--space-3)", flexBasis: "100%", inlineSize: "100%", borderBlockStart: "1px solid var(--line)", paddingBlockStart: "var(--space-3)" }}
        >
          <div>
            <strong>اختر اللعبة الجديدة</strong>
            <p style={{ margin: "4px 0 0", color: "var(--ink-2)", fontSize: ".78rem" }}>سيستمر نفس العداد ونفس التأجير دون إعادة الوقت أو الحساب.</p>
          </div>
          <div className="rental-choice-grid">
            {availableAssets.map((availableAsset) => (
              <button
                key={availableAsset.id}
                type="button"
                aria-pressed={selectedAssetId === availableAsset.id}
                onClick={() => setSelectedAssetId(availableAsset.id)}
              >
                <strong>{availableAsset.name}</strong>
                <span>{availableAsset.assetNumber} · متاحة</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Button type="button" variant="primary" disabled={!selectedAssetId} onClick={save}>تأكيد وتكملة الوقت</Button>
            <Button type="button" onClick={() => { setOpen(false); setSelectedAssetId(""); }}>إلغاء</Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
