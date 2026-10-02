"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useProducts } from "@/features/products/hooks/use-products";
import { useRentalAssets } from "@/features/rental-assets/hooks/use-rental-assets";
import { useInventory } from "../hooks/use-inventory";
import {
  recordTechnicianSparePartIntake,
  requestSparePartRestock,
} from "../services/inventory-service";
import type { SparePartIntakeSource, SparePartRestockPriority } from "../types";
import {
  canAdjustInventory,
  canManageInventory,
  canViewAssetLocations,
  canViewInventory,
  canViewInventoryCost,
  canViewSaleStock,
  canViewSparePartStock,
  isInventoryAdmin,
} from "../permissions";
import { inventoryBranchLabel, inventoryMoney } from "./inventory-labels";
import { InventoryDrawers } from "./InventoryDrawers";

export function InventoryPage() {
  const { roles, activeBranch, availableBranches } = useShell();
  const { balances, partIntakes } = useInventory();
  const { products } = useProducts();
  const assets = useRentalAssets();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [supplySequence, setSupplySequence] = useState(1);
  const [restockSequence, setRestockSequence] = useState(1);
  const technician =
    roles.includes("maintenance_technician") && !isInventoryAdmin(roles);
  const actor = resolvePreviewEmployee(roles).id;
  const manager = canManageInventory(roles);
  const ownerReadOnly = roles.includes("owner") && !manager;
  if (!canViewInventory(roles)) return <PermissionDeniedState />;
  const state = params.get("state") ?? "normal";
  const q = (params.get("q") ?? "").toLowerCase();
  const type = technician
    ? "spare_part"
    : params.get("type") ??
      (roles.includes("maintenance_technician")
        ? "all"
        : canViewSaleStock(roles)
          ? "sale_toy"
          : canViewSparePartStock(roles)
            ? "spare_part"
            : "rental_asset");
  const branch = technician
    ? "workshop"
    : params.get("branch") ?? activeBranch.id;
  const low = !technician && params.get("lowStock") === "true";
  const availability = params.get("availability") ?? "all";
  const allowed = new Set(
    availableBranches
      .filter((item) => item.id !== "all")
      .map((item) => item.id),
  );
  const productMap = new Map(products.map((item) => [item.id, item]));
  const branchLabel = (branchId: string) =>
    inventoryBranchLabel(branchId, availableBranches);
  const visibleBalances = (state === "empty" ? [] : balances)
    .filter((item) =>
      technician
        ? item.branchId === "workshop"
        : isInventoryAdmin(roles) || allowed.has(item.branchId),
    )
    .filter((item) => branch === "all" || item.branchId === branch)
    .filter((item) => {
      const product = productMap.get(item.productId);
      return (
        product &&
        (type === "all" || product.type === type) &&
        (canViewSaleStock(roles) || product.type !== "sale_toy") &&
        (canViewSparePartStock(roles) || product.type !== "spare_part") &&
        (!q ||
          `${product.name} ${product.sku} ${product.barcode}`
            .toLowerCase()
            .includes(q)) &&
        (!low || item.quantityAvailable <= item.minimumStock) &&
        (availability === "all" ||
          (availability === "available"
            ? item.quantityAvailable > 0
            : item.quantityAvailable === 0))
      );
    });
  const scopedAssets = assets.filter(
    (item) => isInventoryAdmin(roles) || allowed.has(item.branchId),
  );
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "type") next.delete("lowStock");
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.replace(next.size ? `${pathname}?${next}` : pathname, {
      scroll: false,
    });
  }
  function showLowStock() {
    const next = new URLSearchParams(params.toString());
    next.set("type", "all");
    next.set("lowStock", "true");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  const lowCount = visibleBalances.filter(
    (item) => item.quantityAvailable <= item.minimumStock,
  ).length;
  const totalValue = balances.reduce(
    (sum, item) => sum + item.quantityOnHand * Number(item.averageCost),
    0,
  );
  const visibleIntakes = isInventoryAdmin(roles)
      ? partIntakes
      : partIntakes.filter((item) => item.receivedByEmployeeId === actor);
  function submitSupply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = recordTechnicianSparePartIntake({
      partName: String(data.get("partName")),
      branchId: "workshop",
      quantity: Number(data.get("quantity")),
      source: String(data.get("source")) as SparePartIntakeSource,
      reference: String(data.get("reference")),
      notes: String(data.get("notes")),
      receivedByEmployeeId: actor,
      idempotencyKey: `technician-spare-intake-${actor}-${supplySequence}`,
    });
    setMessage(result.message);
    if (result.valid) {
      setSupplyOpen(false);
      setSupplySequence((value) => value + 1);
    }
  }
  function submitRestock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = requestSparePartRestock({
      partName: String(data.get("partName")),
      branchId: "workshop",
      requestedQuantity: Number(data.get("quantity")),
      priority: String(data.get("priority")) as SparePartRestockPriority,
      reason: String(data.get("reason")),
      requestedByEmployeeId: actor,
      idempotencyKey: `technician-spare-restock-${actor}-${restockSequence}`,
    });
    setMessage(result.message);
    if (result.valid) {
      setRestockOpen(false);
      setRestockSequence((value) => value + 1);
    }
  }
  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div>
          <span>{ownerReadOnly || manager ? "الإدارة" : "المخزون"}</span>
          <h2>{ownerReadOnly ? "متابعة المخزون" : manager ? "إدارة المخزون" : "المخزون"}</h2>
          <p>
            {ownerReadOnly
              ? "تابع الأرصدة وقيمة المخزون والنواقص والحركات دون تنفيذ تعديلات."
              : manager
                ? "راجع الأرصدة والنواقص، ونفّذ الجرد والتسويات الموثقة عند الحاجة."
                : roles.includes("maintenance_technician")
              ? "كل الموجود فعليًا في الورشة وحركات صرف القطع دون إظهار التكاليف."
              : "المنتجات الكمية منفصلة تمامًا عن أصول التأجير المنفردة."}
          </p>
        </div>
        <div className="inventory-actions">
          {technician ? (
            <>
              <Button variant="primary" onClick={() => setSupplyOpen(true)}>
              إضافة قطعة إلى المخزن
              </Button>
              <Button onClick={() => setRestockOpen(true)}>طلب تزويد</Button>
            </>
          ) : null}
          {canAdjustInventory(roles) ? (
            <Button onClick={() => setAdjustOpen(true)}>جرد وتسوية</Button>
          ) : null}
        </div>
      </header>
      {message ? (
        <p className="inventory-feedback" role="status">
          {message}
        </p>
      ) : null}
      {visibleIntakes.length ? (
        <Card className="inventory-intake-panel">
          <header>
            <strong>آخر توريدات قطع الغيار</strong>
            <span>كل توريد يضيف حركة مخزون موثقة باسم الفني.</span>
          </header>
          <div>
            {visibleIntakes.slice(0, 5).map((intake) => (
              <p key={intake.id}>
                <strong>{intake.intakeNumber}</strong>
                <span>
                  {productMap.get(intake.productId)?.name ?? "منتج غير معروف"} ·
                  +{intake.quantity.toLocaleString("en-US")} ·{" "}
                  {intake.reference}
                </span>
              </p>
            ))}
          </div>
        </Card>
      ) : null}
      <nav className="inventory-tabs" aria-label="أقسام المخزون">
        {technician ? (
          <>
            <Link href="/inventory/restock-requests">طلبات التزويد</Link>
            <Link href="/inventory/movements">سجل الحركات</Link>
          </>
        ) : (
          <>
        {canViewSaleStock(roles) ? (
          <button
            className={!low && type === "sale_toy" ? "is-active" : ""}
            onClick={() => setFilter("type", "sale_toy")}
          >
            ألعاب البيع
          </button>
        ) : null}
        {canViewSparePartStock(roles) ? (
          <button
            className={!low && type === "spare_part" ? "is-active" : ""}
            onClick={() => setFilter("type", "spare_part")}
          >
            قطع الغيار
          </button>
        ) : null}
        {canViewAssetLocations(roles) ? (
          <button
            className={!low && type === "rental_asset" ? "is-active" : ""}
            onClick={() => setFilter("type", "rental_asset")}
          >
            أصول التأجير
          </button>
        ) : null}
        <button
          className={low ? "is-active" : ""}
          onClick={showLowStock}
        >
          منخفض المخزون
        </button>
        <Link href="/inventory/movements">الحركات</Link>
        {isInventoryAdmin(roles) ? (
          <Link href="/inventory/restock-requests">طلبات التزويد</Link>
        ) : null}
          </>
        )}
      </nav>
      <section className="inventory-summary">
        {canViewInventoryCost(roles) ? (
          <Card>
            <span>قيمة المخزون</span>
            <strong>{inventoryMoney(totalValue)}</strong>
          </Card>
        ) : null}
        <Card>
          <span>
            {roles.includes("maintenance_technician")
              ? "أصناف داخل الورشة"
              : "ألعاب بيع متاحة"}
          </span>
          <strong>
            {(roles.includes("maintenance_technician")
              ? visibleBalances.filter((item) => item.quantityAvailable > 0)
              : visibleBalances.filter(
                  (item) =>
                    productMap.get(item.productId)?.type === "sale_toy" &&
                    item.quantityAvailable > 0,
                )
            ).length.toLocaleString("ar-EG-u-nu-latn")}
          </strong>
        </Card>
        <Card>
          <span>قطع غيار منخفضة</span>
          <strong>{lowCount.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
        {canViewAssetLocations(roles) ? (
          <Card>
            <span>أصول خارج التشغيل</span>
            <strong>
              {scopedAssets
                .filter((item) =>
                  ["maintenance", "out_of_service", "in_transit"].includes(
                    item.status,
                  ),
                )
                .length.toLocaleString("ar-EG-u-nu-latn")}
            </strong>
          </Card>
        ) : null}
      </section>
      {state === "loading" ? (
        <Card className="inventory-state">جار تحميل المخزون…</Card>
      ) : state === "error" ? (
        <Card className="inventory-state">
          <h3>تعذر تحميل المخزون</h3>
          <p>تعذر الوصول إلى بيانات المخزون. حاول مرة أخرى.</p>
        </Card>
      ) : type === "rental_asset" && canViewAssetLocations(roles) ? (
        <section className="asset-location-grid">
          {scopedAssets.map((asset) => (
            <Card key={asset.id}>
              <header>
                <strong>{asset.assetNumber}</strong>
                <Badge
                  tone={
                    asset.status === "available"
                      ? "success"
                      : asset.status === "out_of_service"
                        ? "danger"
                        : "info"
                  }
                >
                  {asset.status}
                </Badge>
              </header>
              <h3>{asset.name}</h3>
              <p>
                {branchLabel(asset.branchId)} · {branchLabel(asset.currentLocationId)}
              </p>
              <Link href={`/rental-assets/${asset.id}`}>تفاصيل الأصل</Link>
            </Card>
          ))}
        </section>
      ) : (
        <>
          <Card className="inventory-filters">
            <input
              aria-label="بحث المخزون"
              placeholder={technician ? "ابحث باسم قطعة الغيار" : "الاسم أو SKU أو Barcode"}
              value={params.get("q") ?? ""}
              onChange={(event) => setFilter("q", event.target.value)}
            />
            {!technician ? (
              <select
                aria-label="الفرع"
                value={branch}
                onChange={(event) => setFilter("branch", event.target.value)}
              >
                <option value="all">كل الفروع</option>
                {availableBranches
                  .filter((item) => item.id !== "all")
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.nameAr}
                    </option>
                  ))}
              </select>
            ) : null}
            <select
              aria-label="التوفر"
              value={availability}
              onChange={(event) =>
                setFilter("availability", event.target.value)
              }
            >
              <option value="all">كل حالات التوفر</option>
              <option value="available">متوفر</option>
              <option value="unavailable">غير متوفر</option>
            </select>
          </Card>
          {visibleBalances.length ? (
            <Card className="inventory-list">
              <div className="inventory-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      {technician ? (
                        <th>الكمية المتاحة</th>
                      ) : (
                        <>
                          <th>الفرع</th>
                          <th>بالمخزن</th>
                          <th>محجوز</th>
                          <th>متاح</th>
                          <th>الحد الأدنى</th>
                        </>
                      )}
                      {canViewInventoryCost(roles) ? (
                        <>
                          <th>متوسط التكلفة</th>
                          <th>القيمة</th>
                        </>
                      ) : null}
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBalances.map((balance) => {
                      const product = productMap.get(balance.productId)!;
                      return (
                        <tr key={balance.id}>
                          <td>
                            <strong>{product.name}</strong>
                            {!technician ? <small>{product.sku}</small> : null}
                          </td>
                          {technician ? (
                            <td>{balance.quantityAvailable}</td>
                          ) : (
                            <>
                              <td>{branchLabel(balance.branchId)}</td>
                              <td>{balance.quantityOnHand}</td>
                              <td>{balance.quantityReserved}</td>
                              <td>{balance.quantityAvailable}</td>
                              <td>{balance.minimumStock}</td>
                            </>
                          )}
                          {canViewInventoryCost(roles) ? (
                            <>
                              <td>{inventoryMoney(balance.averageCost)}</td>
                              <td>
                                {inventoryMoney(
                                  balance.quantityOnHand *
                                    Number(balance.averageCost),
                                )}
                              </td>
                            </>
                          ) : null}
                          <td>
                            <Badge
                              tone={
                                balance.quantityAvailable === 0
                                  ? "danger"
                                  : balance.quantityAvailable <=
                                      balance.minimumStock
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {balance.quantityAvailable === 0
                                ? "غير متوفر"
                                : balance.quantityAvailable <=
                                    balance.minimumStock
                                  ? "منخفض"
                                  : "متوفر"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="inventory-mobile-list">
                {visibleBalances.map((balance) => {
                  const product = productMap.get(balance.productId)!;
                  return (
                    <Card key={balance.id} className="inventory-mobile-card">
                      <header>
                        <strong>{product.name}</strong>
                        <Badge
                          tone={
                            balance.quantityAvailable <= balance.minimumStock
                              ? "warning"
                              : "success"
                          }
                        >
                          {balance.quantityAvailable} متاح
                        </Badge>
                      </header>
                      {!technician ? (
                        <p>
                          {product.sku} · {branchLabel(balance.branchId)}
                        </p>
                      ) : null}
                      {!technician ? <dl>
                        <div>
                          <dt>بالمخزن</dt>
                          <dd>{balance.quantityOnHand}</dd>
                        </div>
                        <div>
                          <dt>محجوز</dt>
                          <dd>{balance.quantityReserved}</dd>
                        </div>
                        <div>
                          <dt>الحد الأدنى</dt>
                          <dd>{balance.minimumStock}</dd>
                        </div>
                      </dl> : null}
                    </Card>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="inventory-state">
              <h3>لا توجد أرصدة مطابقة</h3>
              <p>غيّر الفلاتر أو نطاق الفرع.</p>
            </Card>
          )}
        </>
      )}
      <InventoryDrawers
        supplyOpen={supplyOpen}
        onSupplyOpenChange={setSupplyOpen}
        onSubmitSupply={submitSupply}
        restockOpen={restockOpen}
        onRestockOpenChange={setRestockOpen}
        onSubmitRestock={submitRestock}
        adjustOpen={adjustOpen}
        onAdjustOpenChange={setAdjustOpen}
        balances={balances}
        branches={availableBranches}
      />
    </div>
  );
}
