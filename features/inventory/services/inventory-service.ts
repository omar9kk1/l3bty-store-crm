import { EMPLOYEE_FIXTURES } from "@/features/employees/fixtures";
import { publishNotification } from "@/features/notifications/services/notification-service";
import { applyProductStockMovement, getProductSnapshot, subscribeProductStore } from "@/features/products/services/product-store";
import type { ProductStockMovement } from "@/features/products/types";
import { INVENTORY_AUDIT_FIXTURES } from "../fixtures";
import type {
  InventoryAuditEvent,
  InventoryMovementType,
  SparePartIntakeInput,
  SparePartIntakeRecord,
  SparePartRestockInput,
  SparePartRestockRequest,
  SparePartRestockStatus,
  StockAdjustmentInput,
  StockBalance,
  StockMovement,
} from "../types";

const NOW = "2026-08-10T12:00:00+03:00";
let audits: readonly InventoryAuditEvent[] = INVENTORY_AUDIT_FIXTURES.map((item) => ({ ...item }));
let partIntakes: readonly SparePartIntakeRecord[] = [];
let restockRequests: readonly SparePartRestockRequest[] = [];
const listeners = new Set<() => void>();
let sequence = 200;

const typeMap: Record<ProductStockMovement["type"], InventoryMovementType> = {
  opening: "opening_balance", sale: "sale", sale_return: "sale_return", exchange_out: "sale",
  damaged_return: "damaged", maintenance_issue: "maintenance_issue", maintenance_return: "maintenance_return",
  adjustment: "stock_count_difference", purchase_receipt: "purchase_receipt", transfer_dispatch: "transfer_dispatch",
  transfer_receive: "transfer_receive", adjustment_in: "adjustment_in", adjustment_out: "adjustment_out",
  stock_count_difference: "stock_count_difference", damaged: "damaged", written_off: "written_off",
};

function buildInventorySnapshot() {
  const source = getProductSnapshot();
  const balances: StockBalance[] = source.stocks.map((item) => ({
    id: `stock-${item.productId}-${item.branchId}`,
    productId: item.productId,
    branchId: item.branchId,
    quantityOnHand: item.quantityAvailable,
    quantityReserved: item.quantityReserved,
    quantityAvailable: item.quantityAvailable - item.quantityReserved,
    minimumStock: item.minimumStock,
    reorderLevel: item.minimumStock + 2,
    averageCost: item.averageCost.toFixed(2),
    lastMovementAt: item.lastMovementAt,
    updatedAt: item.lastMovementAt,
  }));
  const current = new Map(balances.map((item) => [`${item.productId}:${item.branchId}`, item.quantityOnHand]));
  const movements: StockMovement[] = source.movements.map((item, index) => {
    const after = current.get(`${item.productId}:${item.branchId}`) ?? 0;
    const before = after - item.quantity;
    return {
      id: item.id,
      movementNumber: `MOV-2026-${String(index + 1).padStart(6, "0")}`,
      productId: item.productId,
      branchId: item.branchId,
      type: typeMap[item.type],
      quantity: item.quantity,
      quantityBefore: before,
      quantityAfter: after,
      unitCost: (item.unitCost ?? balances.find((balance) => balance.productId === item.productId && balance.branchId === item.branchId)?.averageCost ?? 0).toString(),
      referenceType: item.type,
      referenceId: item.reference,
      performedByEmployeeId: item.performedByEmployeeId ?? "mock-seed",
      reason: item.reason,
      occurredAt: item.at,
      idempotencyKey: item.idempotencyKey ?? item.id,
    };
  });
  return { balances, movements, audits, partIntakes, restockRequests };
}

let snapshot = buildInventorySnapshot();
const emit = () => listeners.forEach((listener) => listener());
function refresh() { snapshot = buildInventorySnapshot(); emit(); }

subscribeProductStore(() => refresh());
export function subscribeInventory(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getInventorySnapshot() { return snapshot; }

export function calculateMovingWeightedAverage(oldQuantity: number, oldAverageCost: string, receivedQuantity: number, receivedUnitCost: string) {
  if (receivedQuantity <= 0) return oldAverageCost;
  const scale = BigInt(100);
  const oldCost = BigInt(Math.round(Number(oldAverageCost) * 100));
  const receivedCost = BigInt(Math.round(Number(receivedUnitCost) * 100));
  const denominator = BigInt(oldQuantity + receivedQuantity);
  if (denominator === BigInt(0)) return "0.00";
  const cents = (BigInt(oldQuantity) * oldCost + BigInt(receivedQuantity) * receivedCost) / denominator;
  return `${cents / scale}.${String(cents % scale).padStart(2, "0")}`;
}

export function receiveInventory(productId: string, branchId: string, quantity: number, unitCost: string, reference: string, actor: string, idempotencyKey: string) {
  const balance = getInventorySnapshot().balances.find((item) => item.productId === productId && item.branchId === branchId);
  if (!balance || quantity <= 0) return { valid: false, message: "بيانات الاستلام غير صحيحة." };
  const average = calculateMovingWeightedAverage(balance.quantityOnHand, balance.averageCost, quantity, unitCost);
  return applyProductStockMovement({ productId, branchId, quantity, type: "purchase_receipt", reference, reason: "استلام مخزون Mock بمتوسط تكلفة متحرك", performedByEmployeeId: actor, idempotencyKey, unitCost: Number(unitCost), newAverageCost: Number(average) });
}

function employeeHasRole(employeeId: string, roles: readonly string[]) {
  return EMPLOYEE_FIXTURES.find((employee) => employee.id === employeeId && employee.status === "active" && employee.roleAssignments.some((assignment) => roles.includes(assignment.roleKey)));
}

function publishToManagers(title: string, body: string, referenceType: string, referenceId: string, idempotencyPrefix: string, priority: "normal" | "high" | "urgent" = "normal") {
  for (const employee of EMPLOYEE_FIXTURES.filter((item) => item.status === "active" && item.roleAssignments.some((assignment) => ["owner", "manager"].includes(assignment.roleKey)))) {
    publishNotification({
      recipientUserId: employee.userId,
      recipientEmployeeId: employee.id,
      type: referenceType,
      category: "inventory",
      priority,
      title,
      body,
      branchId: "workshop",
      referenceType,
      referenceId,
      deepLink: "/inventory",
      createdAt: NOW,
      expiresAt: null,
      idempotencyKey: `${idempotencyPrefix}-${employee.id}`,
      metadata: {},
    });
  }
}

export function recordTechnicianSparePartIntake(input: SparePartIntakeInput) {
  const duplicate = partIntakes.find((item) => item.idempotencyKey === input.idempotencyKey);
  if (duplicate) return { valid: true, message: "تم تسجيل التوريد سابقًا.", intake: duplicate, duplicate: true };
  const technician = employeeHasRole(input.receivedByEmployeeId, ["maintenance_technician"]);
  const product = getProductSnapshot().products.find((item) => item.id === input.productId && item.type === "spare_part" && item.active);
  const balance = getInventorySnapshot().balances.find((item) => item.productId === input.productId && item.branchId === input.branchId);
  if (!technician) return { valid: false, message: "إضافة توريد قطع الغيار متاحة لفني الصيانة النشط فقط." };
  if (input.branchId !== "workshop") return { valid: false, message: "الفني يضيف التوريد إلى مخزون الورشة فقط." };
  if (!product || !balance) return { valid: false, message: "اختر قطعة غيار موجودة في مخزون الورشة." };
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { valid: false, message: "كمية التوريد يجب أن تكون رقمًا صحيحًا أكبر من صفر." };
  if (!input.reference.trim() && !input.notes.trim()) return { valid: false, message: "أدخل مرجع الشراء أو ملاحظة توضح مصدر القطع." };
  const sourceLabel = input.source === "technician_purchase" ? "شراء بواسطة الفني" : input.source === "technician_brought" ? "قطع أحضرها الفني" : input.source === "supplier_delivery" ? "توريد مورد" : "مصدر آخر";
  const intakeId = `spare-intake-${sequence++}`;
  const reference = input.reference.trim() || `INTAKE-${String(sequence).padStart(5, "0")}`;
  const movement = applyProductStockMovement({
    productId: input.productId,
    branchId: input.branchId,
    quantity: input.quantity,
    type: "purchase_receipt",
    reference,
    reason: `${sourceLabel} · ${input.notes.trim() || "بدون ملاحظات"}`,
    performedByEmployeeId: input.receivedByEmployeeId,
    idempotencyKey: input.idempotencyKey,
    unitCost: Number(balance.averageCost),
    newAverageCost: Number(balance.averageCost),
  });
  if (!movement.valid) return movement;
  const intake: SparePartIntakeRecord = {
    id: intakeId,
    intakeNumber: `SPR-2026-${String(sequence++).padStart(5, "0")}`,
    productId: input.productId,
    branchId: input.branchId,
    quantity: input.quantity,
    source: input.source,
    reference,
    notes: input.notes.trim(),
    receivedByEmployeeId: input.receivedByEmployeeId,
    receivedAt: NOW,
    idempotencyKey: input.idempotencyKey,
  };
  partIntakes = [intake, ...partIntakes];
  restockRequests = restockRequests.map((item) => item.productId === input.productId && item.branchId === input.branchId && ["requested", "approved", "ordered"].includes(item.status) ? { ...item, status: "received", reviewedByEmployeeId: item.reviewedByEmployeeId ?? input.receivedByEmployeeId, reviewNote: [item.reviewNote, `تم التوريد عبر ${intake.intakeNumber}`].filter(Boolean).join(" · "), reviewedAt: NOW } : item);
  publishToManagers("توريد قطع غيار جديد", `${technician.name} أضاف ${product.name} × ${input.quantity} إلى مخزون الورشة.`, "spare_part_intake", intake.id, `spare-intake-note-${intake.id}`);
  refresh();
  return { valid: true, message: "تمت إضافة القطع إلى مخزون الورشة وتسجيل الحركة وإشعار المديرين.", intake, duplicate: false };
}

export function requestSparePartRestock(input: SparePartRestockInput) {
  const duplicate = restockRequests.find((item) => item.idempotencyKey === input.idempotencyKey);
  if (duplicate) return { valid: true, message: "تم إرسال الطلب سابقًا.", request: duplicate, duplicate: true };
  const technician = employeeHasRole(input.requestedByEmployeeId, ["maintenance_technician"]);
  const product = getProductSnapshot().products.find((item) => item.id === input.productId && item.type === "spare_part" && item.active);
  if (!technician) return { valid: false, message: "طلب التزويد متاح لفني الصيانة النشط فقط." };
  if (input.branchId !== "workshop") return { valid: false, message: "طلب الفني يجب أن يكون لمخزون الورشة." };
  if (!product) return { valid: false, message: "اختر قطعة غيار صحيحة." };
  if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity <= 0) return { valid: false, message: "الكمية المطلوبة يجب أن تكون رقمًا صحيحًا أكبر من صفر." };
  if (!input.reason.trim()) return { valid: false, message: "سبب طلب التزويد إلزامي." };
  const open = restockRequests.find((item) => item.productId === input.productId && item.branchId === input.branchId && ["requested", "approved", "ordered"].includes(item.status));
  if (open) return { valid: false, message: `يوجد طلب مفتوح بالفعل برقم ${open.requestNumber}.` };
  const request: SparePartRestockRequest = {
    id: `spare-restock-${sequence++}`,
    requestNumber: `REQ-SPR-2026-${String(sequence++).padStart(5, "0")}`,
    productId: input.productId,
    branchId: input.branchId,
    requestedQuantity: input.requestedQuantity,
    priority: input.priority,
    reason: input.reason.trim(),
    requestedByEmployeeId: input.requestedByEmployeeId,
    status: "requested",
    reviewedByEmployeeId: null,
    reviewNote: "",
    requestedAt: NOW,
    reviewedAt: null,
    idempotencyKey: input.idempotencyKey,
  };
  restockRequests = [request, ...restockRequests];
  publishToManagers("طلب تزويد قطع غيار", `${technician.name} يطلب ${product.name} × ${input.requestedQuantity}. السبب: ${request.reason}`, "spare_part_restock", request.id, `spare-restock-note-${request.id}`, input.priority);
  refresh();
  return { valid: true, message: "تم إرسال طلب التزويد إلى المالك والمديرين.", request, duplicate: false };
}

export function reviewSparePartRestockRequest(requestId: string, actorEmployeeId: string, nextStatus: Exclude<SparePartRestockStatus, "requested" | "received">, reviewNote: string) {
  const request = restockRequests.find((item) => item.id === requestId);
  const reviewer = employeeHasRole(actorEmployeeId, ["owner", "manager"]);
  if (!request) return { valid: false, message: "طلب التزويد غير موجود." };
  if (!reviewer) return { valid: false, message: "مراجعة طلب التزويد متاحة للمالك والمدير فقط." };
  if (!reviewNote.trim()) return { valid: false, message: "ملاحظة قرار الإدارة إلزامية." };
  const validTransition = (request.status === "requested" && ["approved", "rejected"].includes(nextStatus)) || (request.status === "approved" && nextStatus === "ordered");
  if (!validTransition) return { valid: false, message: "لا يمكن تطبيق هذه الحالة على الطلب الحالي." };
  restockRequests = restockRequests.map((item) => item.id === requestId ? { ...item, status: nextStatus, reviewedByEmployeeId: actorEmployeeId, reviewNote: reviewNote.trim(), reviewedAt: NOW } : item);
  const technician = EMPLOYEE_FIXTURES.find((item) => item.id === request.requestedByEmployeeId);
  if (technician) publishNotification({ recipientUserId: technician.userId, recipientEmployeeId: technician.id, type: "spare_part_restock_update", category: "inventory", priority: nextStatus === "rejected" ? "high" : "normal", title: "تحديث طلب تزويد قطع الغيار", body: `${request.requestNumber} · ${nextStatus} · ${reviewNote.trim()}`, branchId: request.branchId, referenceType: "spare_part_restock", referenceId: request.id, deepLink: "/inventory", createdAt: NOW, expiresAt: null, idempotencyKey: `spare-restock-review-${request.id}-${nextStatus}`, metadata: {} });
  refresh();
  return { valid: true, message: "تم تحديث طلب التزويد وإشعار الفني." };
}

export function adjustStock(input: StockAdjustmentInput) {
  const balance = getInventorySnapshot().balances.find((item) => item.productId === input.productId && item.branchId === input.branchId);
  if (!balance) return { valid: false, message: "الرصيد غير موجود." };
  if (!input.reason.trim()) return { valid: false, message: "سبب فرق الجرد إلزامي." };
  const difference = input.actualQuantity - balance.quantityOnHand;
  if (difference === 0) return { valid: false, message: "لا يوجد فرق يحتاج حركة." };
  const result = applyProductStockMovement({ productId: input.productId, branchId: input.branchId, quantity: difference, type: "stock_count_difference", reference: `COUNT-${sequence++}`, reason: `${input.reason} · ${input.notes}`, performedByEmployeeId: input.performedByEmployeeId, idempotencyKey: input.idempotencyKey });
  if (result.valid) {
    audits = [{ id: `inventory-audit-${sequence++}`, action: "stock_count", productId: input.productId, branchId: input.branchId, oldValue: String(balance.quantityOnHand), newValue: String(input.actualQuantity), reason: input.reason, performedByEmployeeId: input.performedByEmployeeId, at: NOW }, ...audits];
    refresh();
  }
  return result;
}

export function resetInventoryService() {
  audits = INVENTORY_AUDIT_FIXTURES.map((item) => ({ ...item }));
  partIntakes = [];
  restockRequests = [];
  sequence = 200;
  refresh();
}