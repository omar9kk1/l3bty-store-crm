import { beforeEach, describe, expect, it } from "vitest";
import { getNotificationsSnapshot, resetNotificationStore } from "@/features/notifications/services/notification-service";
import { resetProductStore } from "@/features/products/services/product-store";
import {
  getInventorySnapshot,
  recordTechnicianSparePartIntake,
  requestSparePartRestock,
  resetInventoryService,
  reviewSparePartRestockRequest,
} from "../services/inventory-service";

describe("technician spare-part replenishment", () => {
  beforeEach(() => {
    resetProductStore();
    resetNotificationStore();
    resetInventoryService();
  });

  it("lets the technician add brought or purchased parts to workshop stock", () => {
    const before = getInventorySnapshot().balances.find((item) => item.productId === "part-battery-12v" && item.branchId === "workshop")!.quantityOnHand;
    const result = recordTechnicianSparePartIntake({
      productId: "part-battery-12v",
      branchId: "workshop",
      quantity: 2,
      source: "technician_purchase",
      reference: "RECEIPT-TECH-1",
      notes: "شراء عاجل للورشة",
      receivedByEmployeeId: "employee-technician",
      idempotencyKey: "technician-intake-test-1",
    });
    expect(result.valid).toBe(true);
    const snapshot = getInventorySnapshot();
    expect(snapshot.balances.find((item) => item.productId === "part-battery-12v" && item.branchId === "workshop")?.quantityOnHand).toBe(before + 2);
    expect(snapshot.movements[0]).toMatchObject({ type: "purchase_receipt", quantity: 2, performedByEmployeeId: "employee-technician" });
    expect(snapshot.partIntakes[0]).toMatchObject({ quantity: 2, reference: "RECEIPT-TECH-1", source: "technician_purchase" });
    expect(getNotificationsSnapshot().notifications.filter((item) => item.referenceType === "spare_part_intake")).toHaveLength(2);
  });

  it("sends a shortage request to managers and closes it when stock arrives", () => {
    const created = requestSparePartRestock({
      productId: "part-motor-550",
      branchId: "workshop",
      requestedQuantity: 4,
      priority: "urgent",
      reason: "المتبقي لا يكفي للصيانات الحالية",
      requestedByEmployeeId: "employee-technician",
      idempotencyKey: "restock-test-1",
    });
    expect(created.valid).toBe(true);
    expect(getNotificationsSnapshot().notifications.filter((item) => item.referenceType === "spare_part_restock")).toHaveLength(2);
    expect(requestSparePartRestock({ productId: "part-motor-550", branchId: "workshop", requestedQuantity: 2, priority: "normal", reason: "طلب مكرر", requestedByEmployeeId: "employee-technician", idempotencyKey: "restock-test-2" }).valid).toBe(false);
    const request = getInventorySnapshot().restockRequests[0];
    expect(reviewSparePartRestockRequest(request.id, "employee-technician", "approved", "محاولة غير مسموحة").valid).toBe(false);
    expect(reviewSparePartRestockRequest(request.id, "employee-manager", "approved", "تم اعتماد التزويد").valid).toBe(true);
    expect(reviewSparePartRestockRequest(request.id, "employee-manager", "ordered", "تم الطلب من المورد").valid).toBe(true);

    expect(recordTechnicianSparePartIntake({ productId: "part-motor-550", branchId: "workshop", quantity: 4, source: "supplier_delivery", reference: "SUPPLIER-4", notes: "وصول طلب التزويد", receivedByEmployeeId: "employee-technician", idempotencyKey: "technician-intake-test-2" }).valid).toBe(true);
    expect(getInventorySnapshot().restockRequests[0]).toMatchObject({ status: "received" });
    expect(getNotificationsSnapshot().notifications.some((item) => item.recipientEmployeeId === "employee-technician" && item.referenceType === "spare_part_restock")).toBe(true);
  });
});