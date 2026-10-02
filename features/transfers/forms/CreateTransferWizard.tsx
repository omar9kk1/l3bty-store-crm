"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useBranchNeeds } from "@/features/branch-needs/hooks/use-branch-needs";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { getInventorySnapshot } from "@/features/inventory/services/inventory-service";
import { useMaintenance } from "@/features/maintenance/hooks/use-maintenance";
import { useProducts } from "@/features/products/hooks/use-products";
import { useRentalAssets } from "@/features/rental-assets/hooks/use-rental-assets";
import { transferTypeLabels } from "../components/transfer-labels";
import {
  creatableTransferTypes,
  isRentalBranchOperator,
  isSalesBranchRequester,
} from "../permissions";
import {
  buildTransferLocationOptions,
  CENTRAL_WORKSHOP_LOCATION_ID,
  resolveTransferLocationName,
} from "../services/transfer-location-options";
import { createTransfer } from "../services/transfer-store";
import type { TransferType } from "../types";
import {
  formatMaintenanceOrderOption,
  formatTransferRoute,
} from "./maintenance-order-option";

const steps = [
  "نوع التحويل",
  "المصدر",
  "الوجهة",
  "العناصر",
  "الكمية والحالة",
  "فحص الصلاحيات والرصيد",
  "المراجعة النهائية",
  "إنشاء الطلب",
];

export function CreateTransferWizard({
  initialType,
  initialOrderId,
  initialNeedId,
}: {
  initialType?: string;
  initialOrderId?: string;
  initialNeedId?: string;
}) {
  const { roles, activeBranch, availableBranches, activeEmployee } = useShell();
  const branches = useBranches();
  const { products } = useProducts();
  const assets = useRentalAssets();
  const { orders, faults } = useMaintenance();
  const { requests: branchNeeds } = useBranchNeeds();
  const router = useRouter();
  const technician =
    roles.includes("maintenance_technician") &&
    !roles.includes("owner") &&
    !roles.includes("manager");
  const salesRequester = isSalesBranchRequester(roles);
  const rentalBranchOperator = isRentalBranchOperator(roles);
  const actor = activeEmployee?.id ?? resolvePreviewEmployee(roles).id;
  const branchNeed = branchNeeds.find(
    (request) =>
      request.id === initialNeedId &&
      request.status === "approved" &&
      !request.transferId,
  );
  const branchNeedType: TransferType | undefined = branchNeed
    ? branchNeed.kind === "sales_item"
      ? "branch_stock"
      : "rental_asset"
    : undefined;
  const wizardSteps = salesRequester
    ? [
        "نوع الطلب",
        "مصدر التزويد",
        "فرع الاستلام",
        "لعبة البيع",
        "الكمية والحالة",
        "فحص الرصيد",
        "المراجعة النهائية",
        "إرسال الطلب",
      ]
    : rentalBranchOperator
      ? [
          "نوع الحركة",
          "مكان اللعبة",
          "وجهة اللعبة",
          "اللعبة",
          "حالة التسليم",
          "فحص النطاق",
          "المراجعة النهائية",
          "إرسال الطلب",
        ]
      : steps;
  const baseTypes = creatableTransferTypes(roles);
  const rentalMaintenanceRequest =
    rentalBranchOperator &&
    initialType === "maintenance_to_workshop" &&
    Boolean(initialOrderId);
  const types: readonly TransferType[] = branchNeedType
    ? [branchNeedType]
    : rentalBranchOperator
      ? rentalMaintenanceRequest
        ? ["maintenance_to_workshop"]
        : ["rental_asset"]
      : baseTypes;
  const effectiveInitialType = branchNeedType ?? initialType;
  const requestedType = types.includes(effectiveInitialType as TransferType)
    ? (effectiveInitialType as TransferType)
    : ((types[0] ?? "branch_stock") as TransferType);
  const requestedOrder = orders.find(
    (item) =>
      item.id === initialOrderId &&
      (!technician || item.assignedTechnicianId === actor) &&
      (!rentalBranchOperator || item.branchId === activeBranch.id),
  );
  const defaultSalesSource =
    availableBranches.find(
      (item) => item.id !== "all" && item.id !== activeBranch.id,
    )?.id ?? "";
  const defaultRentalSource =
    availableBranches.find(
      (item) => item.id !== "all" && item.id !== activeBranch.id,
    )?.id ?? "";
  const firstOperationalBranchId =
    availableBranches.find((item) => item.id !== "all")?.id ?? activeBranch.id;
  const matchedNeedAsset =
    branchNeed?.kind === "rental_game"
      ? assets.find((item) => item.name.trim() === branchNeed.itemName.trim())
      : undefined;
  const [step, setStep] = useState(1);
  const [selectedType, setTypeState] = useState<TransferType>(requestedType);
  const type = types.includes(selectedType)
    ? selectedType
    : ((types[0] ?? "branch_stock") as TransferType);
  const [source, setSource] = useState(
    technician && requestedType === "maintenance_to_workshop" && requestedOrder
      ? requestedOrder.branchId
      : technician
        ? CENTRAL_WORKSHOP_LOCATION_ID
        : matchedNeedAsset
          ? matchedNeedAsset.branchId
          : rentalBranchOperator
            ? requestedType === "maintenance_to_workshop"
              ? activeBranch.id
              : defaultRentalSource
            : salesRequester
              ? defaultSalesSource
              : (availableBranches.find(
                  (item) =>
                    item.id !== "all" && item.id !== branchNeed?.branchId,
                )?.id ?? "main"),
  );
  const [destination, setDestination] = useState(
    technician && requestedType === "maintenance_to_workshop"
      ? CENTRAL_WORKSHOP_LOCATION_ID
      : technician && requestedOrder
        ? requestedOrder.branchId
        : technician
          ? firstOperationalBranchId
          : rentalBranchOperator
            ? requestedType === "maintenance_to_workshop"
              ? CENTRAL_WORKSHOP_LOCATION_ID
              : activeBranch.id
            : branchNeed
              ? branchNeed.branchId
              : salesRequester
                ? activeBranch.id
                : (availableBranches.find(
                    (item) => item.id !== "all" && item.id !== source,
                  )?.id ?? firstOperationalBranchId),
  );
  const matchedNeedItemId = branchNeed
    ? branchNeed.kind === "sales_item"
      ? (products.find(
          (item) => item.name.trim() === branchNeed.itemName.trim(),
        )?.id ?? "")
      : (matchedNeedAsset?.id ?? "")
    : "";
  const [itemId, setItemId] = useState(matchedNeedItemId);
  const [quantity, setQuantity] = useState(branchNeed?.quantity ?? 1);
  const [condition, setCondition] = useState(
    requestedType === "maintenance_to_workshop" && requestedOrder
      ? "تم الاستلام من الفرع بالحالة والملحقات الموثقة"
      : "سليم ومغلف",
  );
  const [reason, setReason] = useState(
    requestedType === "maintenance_to_workshop" && requestedOrder
      ? "تسليم اللعبة للورشة المركزية للصيانة"
      : branchNeed
        ? `${branchNeed.requestNumber}: ${branchNeed.reason}`
        : rentalBranchOperator
          ? "طلب نقل لعبة تأجير إلى " + activeBranch.nameAr
          : salesRequester
            ? "تزويد " + activeBranch.nameAr + " بألعاب البيع"
            : "",
  );
  const [notes, setNotes] = useState(
    branchNeed ? `طلب احتياج: ${branchNeed.itemName}` : "",
  );
  const [orderId, setOrderId] = useState(requestedOrder?.id ?? "");
  const [message, setMessage] = useState("");

  if (initialNeedId && !branchNeed)
    return (
      <Card className="transfer-wizard__panel">
        <h2>طلب الاحتياج غير متاح لإنشاء تحويل</h2>
        <p>قد يكون الطلب غير معتمد، أو تم إنشاء تحويل له بالفعل.</p>
        <Link href="/inventory/branch-needs">العودة إلى طلبات الفروع</Link>
      </Card>
    );

  const allLocations = buildTransferLocationOptions(branches);
  const scopedLocations = availableBranches
    .filter((item) => item.id !== "all")
    .map((item) => ({ id: item.id, name: item.nameAr }));
  const locations =
    technician || rentalBranchOperator ? allLocations : scopedLocations;
  const locationName = (locationId: string) =>
    resolveTransferLocationName(locationId, [
      ...locations,
      ...availableBranches.map((item) => ({ id: item.id, name: item.nameAr })),
    ]);
  const branchLocations = locations.filter(
    (item) => item.id !== CENTRAL_WORKSHOP_LOCATION_ID,
  );
  const workshop = locations.filter(
    (item) => item.id === CENTRAL_WORKSHOP_LOCATION_ID,
  );
  const sourceOptions = salesRequester
    ? locations.filter((item) => item.id !== activeBranch.id)
    : rentalBranchOperator
      ? type === "rental_asset"
        ? scopedLocations.filter((item) => item.id !== activeBranch.id)
        : branchLocations.filter((item) => item.id === activeBranch.id)
      : technician
        ? type === "maintenance_to_workshop"
          ? branchLocations
          : workshop
        : locations;
  const destinationOptions = salesRequester
    ? locations.filter((item) => item.id === activeBranch.id)
    : rentalBranchOperator
      ? type === "rental_asset"
        ? branchLocations.filter((item) => item.id === activeBranch.id)
        : workshop
      : technician
        ? type === "maintenance_to_workshop"
          ? workshop
          : branchLocations
        : locations;
  const stockType = ["branch_stock", "workshop_parts"].includes(type);
  const assetType = type === "rental_asset";
  const maintenanceType = [
    "maintenance_to_workshop",
    "maintenance_return",
  ].includes(type);
  const productOptions = stockType
    ? products.filter(
        (item) =>
          item.active &&
          (salesRequester
            ? item.type === "sale_toy"
            : !technician || item.type === "spare_part"),
      )
    : [];
  const assetOptions = assets.filter(
    (item) =>
      item.branchId === source &&
      item.status === "available" &&
      item.currentLocationId !== "in_transit",
  );
  const assignedOrders = orders.filter(
    (item) =>
      (!technician || item.assignedTechnicianId === actor) &&
      (!rentalBranchOperator || item.branchId === activeBranch.id),
  );
  const maintenanceItemNames = new Map(
    faults.map((fault) => [fault.id, fault.itemName]),
  );
  const selectedOrder = orders.find((item) => item.id === orderId);
  const balance = getInventorySnapshot().balances.find(
    (item) => item.productId === itemId && item.branchId === source,
  );

  function setType(next: TransferType) {
    setTypeState(next);
    setItemId("");
    setOrderId("");
    if (rentalBranchOperator) {
      setSource(
        next === "maintenance_to_workshop"
          ? activeBranch.id
          : defaultRentalSource,
      );
      setDestination(
        next === "maintenance_to_workshop"
          ? CENTRAL_WORKSHOP_LOCATION_ID
          : activeBranch.id,
      );
      return;
    }
    if (!technician) return;
    if (next === "maintenance_to_workshop") {
      setSource(branchLocations[0]?.id ?? "main");
      setDestination(CENTRAL_WORKSHOP_LOCATION_ID);
    } else {
      setSource(CENTRAL_WORKSHOP_LOCATION_ID);
      setDestination(branchLocations[0]?.id ?? "main");
    }
  }

  function selectOrder(nextOrderId: string) {
    setOrderId(nextOrderId);
    const order = orders.find((item) => item.id === nextOrderId);
    if (rentalBranchOperator && order) {
      setSource(activeBranch.id);
      setDestination(CENTRAL_WORKSHOP_LOCATION_ID);
      return;
    }
    if (!technician || !order) return;
    if (type === "maintenance_to_workshop") {
      setSource(order.branchId);
      setDestination(CENTRAL_WORKSHOP_LOCATION_ID);
    } else if (type === "maintenance_return") {
      setSource(CENTRAL_WORKSHOP_LOCATION_ID);
      setDestination(order.branchId);
    }
  }

  function finish() {
    const itemType = stockType
      ? "stock_product"
      : assetType
        ? "rental_asset"
        : "maintenance_item";
    const result = createTransfer(
      {
        transferType: type,
        sourceLocationId: source,
        destinationLocationId: destination,
        requestedByEmployeeId: actor,
        reason,
        notes,
        items: [
          {
            itemType,
            productId: stockType ? itemId : null,
            rentalAssetId: assetType ? itemId : null,
            quantityRequested: stockType ? quantity : 1,
            conditionAtDispatch: condition,
            note: notes,
          },
        ],
        relatedMaintenanceOrderId: maintenanceType ? orderId : "",
        relatedBranchNeedId: branchNeed?.id,
        idempotencyKey:
          "transfer-new-" +
          type +
          "-" +
          source +
          "-" +
          destination +
          "-" +
          (itemId || orderId) +
          "-" +
          (branchNeed?.id ?? "direct"),
      },
      roles,
      salesRequester || rentalBranchOperator ? activeBranch.id : undefined,
    );
    setMessage(result.message);
    if (result.valid && result.transfer)
      router.push("/inventory/transfers/" + result.transfer.id);
  }

  const valid =
    source !== destination &&
    Boolean(stockType || assetType ? itemId : orderId) &&
    Boolean(reason.trim()) &&
    (!stockType || (balance?.quantityAvailable ?? 0) >= quantity) &&
    (!technician ||
      (sourceOptions.some((item) => item.id === source) &&
        destinationOptions.some((item) => item.id === destination))) &&
    (!salesRequester ||
      (sourceOptions.some((item) => item.id === source) &&
        destination === activeBranch.id &&
        productOptions.some((item) => item.id === itemId))) &&
    (!rentalBranchOperator ||
      (sourceOptions.some((item) => item.id === source) &&
        destinationOptions.some((item) => item.id === destination) &&
        (assetType
          ? assetOptions.some((item) => item.id === itemId)
          : Boolean(
              selectedOrder && selectedOrder.branchId === activeBranch.id,
            ))));

  return (
    <div className="transfer-wizard">
      <ol>
        {wizardSteps.map((label, index) => (
          <li
            key={label}
            className={
              step === index + 1
                ? "is-active"
                : step > index + 1
                  ? "is-done"
                  : ""
            }
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <Card className="transfer-wizard__panel">
        {step === 1 ? (
          <section>
            <h2>
              {salesRequester
                ? "اختر نوع الطلب"
                : rentalBranchOperator
                  ? "اختر حركة لعبة التأجير"
                  : "اختر نوع التحويل"}
            </h2>
            <div className="transfer-choice-grid">
              {types.map((value) => (
                <button
                  type="button"
                  className={type === value ? "is-active" : ""}
                  onClick={() => setType(value)}
                  key={value}
                >
                  {salesRequester && value === "branch_stock"
                    ? "تزويد ألعاب بيع للفرع"
                    : rentalBranchOperator
                      ? value === "rental_asset"
                        ? "طلب لعبة تأجير للفرع"
                        : "تسليم لعبة للصيانة"
                      : transferTypeLabels[value]}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {step === 2 ? (
          <section>
            <h2>
              {salesRequester
                ? "مصدر التزويد"
                : rentalBranchOperator
                  ? type === "rental_asset"
                    ? "الفرع الموجود به اللعبة"
                    : "فرع تسليم الصيانة"
                  : "المصدر"}
            </h2>
            <label>
              {salesRequester
                ? "المخزن أو الفرع المورّد"
                : rentalBranchOperator
                  ? "مكان اللعبة الحالي"
                  : "موقع المصدر"}
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                {sourceOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {technician ? (
              <p>المصدر مقيد باتجاه حركة عهدة الورشة.</p>
            ) : salesRequester ? (
              <p>اختر المكان الذي سيجهز ألعاب البيع بعد اعتماد الإدارة.</p>
            ) : rentalBranchOperator ? (
              <p>
                {type === "rental_asset"
                  ? "اختر الفرع الذي ستأتي منه لعبة التأجير."
                  : "التسليم يبدأ من فرعك الحالي ويرتبط بأمر الصيانة."}
              </p>
            ) : null}
          </section>
        ) : null}
        {step === 3 ? (
          <section>
            <h2>
              {salesRequester
                ? "فرع الاستلام"
                : rentalBranchOperator
                  ? type === "rental_asset"
                    ? "فرع الاستلام"
                    : "وجهة الصيانة"
                  : "الوجهة"}
            </h2>
            <label>
              {salesRequester
                ? "فرعك الحالي"
                : rentalBranchOperator
                  ? type === "rental_asset"
                    ? "فرعك الحالي"
                    : "الورشة المركزية"
                  : "موقع الوجهة"}
              <select
                value={destination}
                disabled={
                  Boolean(branchNeed) || salesRequester || rentalBranchOperator
                }
                onChange={(event) => setDestination(event.target.value)}
              >
                {destinationOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {salesRequester ? (
              <p>
                الوجهة ثابتة على {activeBranch.nameAr} ولا يمكن طلب مخزون لفرع
                آخر.
              </p>
            ) : rentalBranchOperator ? (
              <p>
                {type === "rental_asset"
                  ? `اللعبة ستصل إلى ${activeBranch.nameAr} بعد اعتماد وإرسال الفرع المصدر.`
                  : "اللعبة ستخرج من فرعك إلى الورشة ضمن أمر الصيانة فقط."}
              </p>
            ) : source === destination ? (
              <p className="transfer-error">يجب أن تختلف الوجهة عن المصدر.</p>
            ) : null}
          </section>
        ) : null}
        {step === 4 ? (
          <section>
            <h2>العناصر</h2>
            {stockType ? (
              <label>
                {salesRequester ? "لعبة البيع" : "قطعة الغيار"}
                <select
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                >
                  <option value="">
                    {salesRequester ? "اختر لعبة بيع" : "اختر قطعة"}
                  </option>
                  {productOptions.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : assetType ? (
              <label>
                {rentalBranchOperator ? "لعبة التأجير" : "أصل التأجير"}
                <select
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                >
                  <option value="">
                    {rentalBranchOperator
                      ? "اختر لعبة متاحة للنقل"
                      : "اختر أصلًا"}
                  </option>
                  {assetOptions.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.assetNumber} · {item.name} · {item.status}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                أمر الصيانة
                <select
                  value={orderId}
                  onChange={(event) => selectOrder(event.target.value)}
                >
                  <option value="">اختر أمرًا</option>
                  {assignedOrders.map((item) => (
                    <option value={item.id} key={item.id}>
                      {formatMaintenanceOrderOption(
                        item,
                        maintenanceItemNames.get(item.faultReportId),
                      )}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
        ) : null}
        {step === 5 ? (
          <section>
            <h2>الكمية والحالة</h2>
            {stockType ? (
              <label>
                الكمية
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </label>
            ) : null}
            <label>
              الحالة عند التسليم
              <textarea
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
              />
            </label>
            <label>
              {salesRequester
                ? "سبب طلب التزويد"
                : rentalBranchOperator
                  ? type === "rental_asset"
                    ? "سبب طلب اللعبة"
                    : "سبب التسليم للصيانة"
                  : "سبب التحويل"}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <label>
              ملاحظات
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </section>
        ) : null}
        {step === 6 ? (
          <section>
            <h2>فحص الصلاحيات والرصيد</h2>
            <p>
              المصدر: {locationName(source)} · الوجهة: {locationName(destination)}
            </p>
            {stockType ? (
              <p>
                الرصيد المتاح: {balance?.quantityAvailable ?? 0} · المطلوب:{" "}
                {quantity}
              </p>
            ) : (
              <p>أمر الصيانة: {selectedOrder?.orderNumber ?? "لم يُحدد"}</p>
            )}
            <BadgeLine valid={valid} />
          </section>
        ) : null}
        {step === 7 ? (
          <section>
            <h2>المراجعة النهائية</h2>
            <dl>
              <div>
                <dt>النوع</dt>
                <dd>
                  {salesRequester
                    ? "تزويد ألعاب بيع للفرع"
                    : rentalBranchOperator
                      ? type === "rental_asset"
                        ? "نقل لعبة تأجير إلى الفرع"
                        : "تسليم لعبة للورشة"
                      : transferTypeLabels[type]}
                </dd>
              </div>
              <div>
                <dt>المسار</dt>
                <dd>
                  {formatTransferRoute(source, destination, locationName)}
                </dd>
              </div>
              <div>
                <dt>العنصر</dt>
                <dd>
                  {selectedOrder
                    ? formatMaintenanceOrderOption(
                        selectedOrder,
                        maintenanceItemNames.get(selectedOrder.faultReportId),
                      )
                    : itemId || "—"}
                </dd>
              </div>
              <div>
                <dt>الكمية</dt>
                <dd>{stockType ? quantity : 1}</dd>
              </div>
              <div>
                <dt>السبب</dt>
                <dd>{reason || "—"}</dd>
              </div>
            </dl>
          </section>
        ) : null}
        {step === 8 ? (
          <section>
            <h2>
              {salesRequester
                ? "إرسال طلب التزويد"
                : rentalBranchOperator
                  ? "إرسال طلب حركة اللعبة"
                  : "إنشاء الطلب"}
            </h2>
            <p>
              {salesRequester
                ? "سيصل الطلب للإدارة للاعتماد والتجهيز، ولن يتغير الرصيد حتى الإرسال والاستلام."
                : rentalBranchOperator
                  ? "سيصل الطلب للإدارة للاعتماد، ويظل موقع اللعبة كما هو حتى تأكيد التسليم والاستلام."
                  : "سيُسجل الطلب باسم المستخدم الحالي، ولن يتغير الرصيد قبل الاعتماد والإرسال."}
            </p>
            {message ? (
              <p className="transfer-error" role="status">
                {message}
              </p>
            ) : null}
            <Button variant="primary" disabled={!valid} onClick={finish}>
              {salesRequester
                ? "إرسال طلب تزويد الفرع"
                : rentalBranchOperator
                  ? type === "rental_asset"
                    ? "إرسال طلب نقل اللعبة"
                    : "إرسال طلب تسليم الصيانة"
                  : "إنشاء طلب التحويل"}
            </Button>
          </section>
        ) : null}
      </Card>
      <div className="transfer-wizard__actions">
        <Button
          disabled={step === 1}
          onClick={() => setStep((value) => Math.max(1, value - 1))}
        >
          السابق
        </Button>
        {step < 8 ? (
          <Button
            variant="primary"
            onClick={() => setStep((value) => Math.min(8, value + 1))}
          >
            التالي
          </Button>
        ) : (
          <Link
            className="ui-button ui-button--secondary ui-button--md"
            href="/inventory/transfers"
          >
            إلغاء
          </Link>
        )}
      </div>
    </div>
  );
}

function BadgeLine({ valid }: { valid: boolean }) {
  return (
    <p className={valid ? "transfer-valid" : "transfer-error"}>
      {valid ? "الفحص الأولي ناجح." : "أكمل البيانات أو صحح النطاق والرصيد."}
    </p>
  );
}
