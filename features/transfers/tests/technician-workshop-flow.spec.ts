import { beforeEach, describe, expect, it } from "vitest";
import { resetMaintenanceStore, getMaintenanceSnapshot } from "@/features/maintenance/services/maintenance-store";
import { resetProductStore } from "@/features/products/services/product-store";
import { resetRentalStore } from "@/features/rentals/services/rental-store";
import {
  allowedTransferTypes,
  canCreateTransfer,
  canDispatchTransfer,
  canReceiveTransfer,
  isTechnicianTransferDirectionValid,
} from "../permissions";
import {
  approveTransfer,
  createTransfer,
  dispatchTransfer,
  getTransfersSnapshot,
  receiveTransfer,
  resetTransferStore,
} from "../services/transfer-store";

describe("technician workshop custody flow", () => {
  beforeEach(() => {
    resetProductStore();
    resetRentalStore();
    resetMaintenanceStore();
    resetTransferStore();
  });

  it("allows the technician to create only workshop-related directions", () => {
    expect(canCreateTransfer(["maintenance_technician"])).toBe(true);
    expect(allowedTransferTypes(["maintenance_technician"])).toEqual(["workshop_parts", "maintenance_to_workshop", "maintenance_return"]);
    expect(isTechnicianTransferDirectionValid("workshop_parts", "workshop", "main")).toBe(true);
    expect(isTechnicianTransferDirectionValid("maintenance_to_workshop", "branch-2", "workshop")).toBe(true);
    expect(isTechnicianTransferDirectionValid("maintenance_return", "workshop", "main")).toBe(true);
    expect(isTechnicianTransferDirectionValid("workshop_parts", "main", "workshop")).toBe(true);
    expect(isTechnicianTransferDirectionValid("workshop_parts", "main", "branch-2")).toBe(false);
    expect(isTechnicianTransferDirectionValid("branch_stock", "workshop", "main")).toBe(false);
  });

  it("restricts technician dispatch and receipt to the correct custody side", () => {
    const transfers = getTransfersSnapshot().transfers;
    const incoming = transfers.find((item) => item.transferType === "maintenance_to_workshop" && item.status === "in_transit")!;
    const outgoingParts = transfers.find((item) => item.transferType === "workshop_parts" && item.sourceLocationId !== "workshop")!;
    const workshopScope = new Set(["workshop"]);
    expect(canReceiveTransfer(["maintenance_technician"], incoming, workshopScope)).toBe(true);
    expect(canDispatchTransfer(["maintenance_technician"], incoming, workshopScope)).toBe(true);
    expect(canDispatchTransfer(["maintenance_technician"], outgoingParts, workshopScope)).toBe(false);
    expect(canReceiveTransfer(["maintenance_technician"], outgoingParts, workshopScope)).toBe(true);
  });

  it("records return dispatch by the technician and branch receipt by the employee", () => {
    const created = createTransfer({
      transferType: "maintenance_return",
      sourceLocationId: "workshop",
      destinationLocationId: "main",
      requestedByEmployeeId: "employee-technician",
      reason: "إرجاع اللعبة بعد الإصلاح",
      notes: "تم اجتياز اختبار الجودة",
      items: [{
        itemType: "maintenance_item",
        productId: null,
        rentalAssetId: null,
        quantityRequested: 1,
        conditionAtDispatch: "تم الإصلاح والاختبار",
        note: "",
      }],
      relatedMaintenanceOrderId: "maintenance-order-9",
      idempotencyKey: "technician-return-order-9",
    }, ["maintenance_technician"]);
    expect(created.valid).toBe(true);
    expect(created.transfer?.status).toBe("pending_approval");

    approveTransfer(created.transfer!.id, ["manager"], "employee-manager", "اعتماد عودة اللعبة", true);
    expect(dispatchTransfer(created.transfer!.id, "employee-technician").valid).toBe(true);
    expect(getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-9")?.status).toBe("returning_to_branch");

    const transfer = getTransfersSnapshot().transfers.find((item) => item.id === created.transfer!.id)!;
    expect(receiveTransfer(transfer.id, { [transfer.items[0].id]: 1 }, { [transfer.items[0].id]: "سليم" }, "employee-rental", "").valid).toBe(true);
    const order = getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-9")!;
    expect(order.status).toBe("ready_for_delivery");
    expect(order.currentLocation).toBe("main");
  });


  it("starts a linked pickup request before the technician dispatches the game", () => {
    const created = createTransfer({
      transferType: "maintenance_to_workshop",
      sourceLocationId: "branch-2",
      destinationLocationId: "workshop",
      requestedByEmployeeId: "employee-technician",
      reason: "استلام اللعبة ونقلها إلى الورشة المركزية",
      notes: "",
      items: [{
        itemType: "maintenance_item",
        productId: null,
        rentalAssetId: null,
        quantityRequested: 1,
        conditionAtDispatch: "تم الاستلام بالحالة والملحقات الموثقة",
        note: "",
      }],
      relatedMaintenanceOrderId: "maintenance-order-3",
      idempotencyKey: "technician-pickup-order-3",
    }, ["maintenance_technician"]);
    expect(created.valid).toBe(true);
    expect(getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-3")?.status).toBe("transfer_requested");
    expect(getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-3")?.workshopTransfer).not.toBeNull();

    const duplicateRequest = createTransfer({
      transferType: "maintenance_to_workshop",
      sourceLocationId: "branch-2",
      destinationLocationId: "workshop",
      requestedByEmployeeId: "employee-technician",
      reason: "طلب ثانٍ غير مسموح",
      notes: "",
      items: [{ itemType: "maintenance_item", productId: null, rentalAssetId: null, quantityRequested: 1, conditionAtDispatch: "سليم", note: "" }],
      relatedMaintenanceOrderId: "maintenance-order-3",
      idempotencyKey: "technician-pickup-order-3-duplicate",
    }, ["maintenance_technician"]);
    expect(duplicateRequest.valid).toBe(false);

    approveTransfer(created.transfer!.id, ["manager"], "employee-manager", "اعتماد استلام اللعبة", true);
    expect(dispatchTransfer(created.transfer!.id, "employee-technician").valid).toBe(true);
    expect(getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-3")?.status).toBe("in_transit_to_workshop");

    const transfer = getTransfersSnapshot().transfers.find((item) => item.id === created.transfer!.id)!;
    expect(receiveTransfer(transfer.id, { [transfer.items[0].id]: 1 }, { [transfer.items[0].id]: "مطابقة للتوثيق" }, "employee-technician", "").valid).toBe(true);
    expect(getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-3")?.status).toBe("received_at_workshop");
  });
  it("rejects a technician parts transfer that bypasses the workshop", () => {
    const result = createTransfer({
      transferType: "workshop_parts",
      sourceLocationId: "main",
      destinationLocationId: "branch-2",
      requestedByEmployeeId: "employee-technician",
      reason: "اتجاه غير صحيح",
      notes: "",
      items: [{
        itemType: "stock_product",
        productId: "part-battery-12v",
        rentalAssetId: null,
        quantityRequested: 1,
        conditionAtDispatch: "سليم",
        note: "",
      }],
      relatedMaintenanceOrderId: "",
      idempotencyKey: "technician-invalid-direction",
    }, ["maintenance_technician"]);
    expect(result.valid).toBe(false);
  });
});
