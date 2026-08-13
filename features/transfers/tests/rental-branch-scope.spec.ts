import { beforeEach, describe, expect, it } from "vitest";
import { resetInventoryService } from "@/features/inventory/services/inventory-service";
import { resetMaintenanceStore } from "@/features/maintenance/services/maintenance-store";
import { resetProductStore } from "@/features/products/services/product-store";
import { getRentalSnapshot, resetRentalStore } from "@/features/rentals/services/rental-store";
import { allowedTransferTypes, canDispatchTransfer, canReceiveTransfer, creatableTransferTypes } from "../permissions";
import {
  approveTransfer,
  cancelTransfer,
  createTransfer,
  dispatchTransfer,
  getTransfersSnapshot,
  receiveTransfer,
  resetTransferStore,
} from "../services/transfer-store";
import type { CreateTransferInput } from "../types";

const rentalAssetRequest = (
  key: string,
  destinationLocationId = "branch-2",
  rentalAssetId = "asset-scooter-01",
): CreateTransferInput => ({
  transferType: "rental_asset",
  sourceLocationId: "main",
  destinationLocationId,
  requestedByEmployeeId: "employee-rental",
  reason: "Move a rental asset to the active branch",
  notes: "",
  items: [{
    itemType: "rental_asset",
    productId: null,
    rentalAssetId,
    quantityRequested: 1,
    conditionAtDispatch: "Good",
    note: "",
  }],
  relatedMaintenanceOrderId: "",
  idempotencyKey: key,
});

const maintenanceHandover = (key: string, branchId = "branch-2", orderId = "maintenance-order-3"): CreateTransferInput => ({
  transferType: "maintenance_to_workshop",
  sourceLocationId: branchId,
  destinationLocationId: "workshop",
  requestedByEmployeeId: "employee-rental",
  reason: "Hand the item to the central workshop",
  notes: "",
  items: [{
    itemType: "maintenance_item",
    productId: null,
    rentalAssetId: null,
    quantityRequested: 1,
    conditionAtDispatch: "Documented",
    note: "",
  }],
  relatedMaintenanceOrderId: orderId,
  idempotencyKey: key,
});

describe("rental branch transfer scope", () => {
  beforeEach(() => {
    resetProductStore();
    resetRentalStore();
    resetMaintenanceStore();
    resetInventoryService();
    resetTransferStore();
  });

  it("excludes workshop parts and keeps only rental and maintenance movement types", () => {
    expect(creatableTransferTypes(["rental_maintenance_employee"])).toEqual(["rental_asset", "maintenance_to_workshop"]);
    expect(allowedTransferTypes(["rental_maintenance_employee"])).toEqual(["rental_asset", "maintenance_to_workshop", "maintenance_return"]);
    expect(allowedTransferTypes(["rental_maintenance_employee"])).not.toContain("workshop_parts");
  });

  it("allows an available rental asset request only into the active branch", () => {
    expect(cancelTransfer("transfer-3", ["manager"], "employee-manager", "Release fixture asset").valid).toBe(true);
    expect(createTransfer(rentalAssetRequest("rental-valid"), ["rental_maintenance_employee"], "branch-2").valid).toBe(true);
    expect(createTransfer(rentalAssetRequest("rental-other-branch", "branch-3"), ["rental_maintenance_employee"], "branch-2").valid).toBe(false);
    expect(createTransfer(rentalAssetRequest("rental-unavailable", "branch-2", "asset-electric-car-retired"), ["rental_maintenance_employee"], "branch-2").valid).toBe(false);
  });

  it("allows workshop handover only from the active branch and linked branch order", () => {
    expect(createTransfer(maintenanceHandover("maintenance-valid"), ["rental_maintenance_employee"], "branch-2").valid).toBe(true);
    expect(createTransfer(maintenanceHandover("maintenance-wrong-branch", "main", "maintenance-order-2"), ["rental_maintenance_employee"], "branch-2").valid).toBe(false);
    expect(createTransfer({ ...maintenanceHandover("parts-denied"), transferType: "workshop_parts" }, ["rental_maintenance_employee"], "branch-2").valid).toBe(false);
  });

  it("receives an incoming rental asset but cannot dispatch another branch asset", () => {
    const requested = getTransfersSnapshot().transfers.find((item) => item.id === "transfer-3")!;
    expect(canDispatchTransfer(["rental_maintenance_employee"], requested, new Set(["branch-2"]))).toBe(false);
    expect(canReceiveTransfer(["rental_maintenance_employee"], requested, new Set(["branch-2"]))).toBe(true);
    expect(approveTransfer(requested.id, ["manager"], "employee-manager", "Approved").valid).toBe(true);
    expect(dispatchTransfer(requested.id, "employee-manager", ["manager"]).valid).toBe(true);
    const inTransit = getTransfersSnapshot().transfers.find((item) => item.id === requested.id)!;
    expect(receiveTransfer(
      inTransit.id,
      { [inTransit.items[0].id]: 1 },
      { [inTransit.items[0].id]: "Good" },
      "employee-rental",
      "",
      ["rental_maintenance_employee"],
      "branch-2",
    ).valid).toBe(true);
    expect(getRentalSnapshot().assets.find((item) => item.id === "asset-scooter-01")?.branchId).toBe("branch-2");
  });

  it("can hand branch maintenance to the workshop but cannot receive it as workshop staff", () => {
    const created = createTransfer(maintenanceHandover("maintenance-flow"), ["manager"]);
    expect(created.valid).toBe(true);
    expect(approveTransfer(created.transfer!.id, ["manager"], "employee-manager", "Approved").valid).toBe(true);
    expect(dispatchTransfer(created.transfer!.id, "employee-rental", ["rental_maintenance_employee"], "branch-2").valid).toBe(true);
    const inTransit = getTransfersSnapshot().transfers.find((item) => item.id === created.transfer!.id)!;
    expect(canReceiveTransfer(["rental_maintenance_employee"], inTransit, new Set(["branch-2"]))).toBe(false);
    expect(receiveTransfer(
      inTransit.id,
      { [inTransit.items[0].id]: 1 },
      { [inTransit.items[0].id]: "Good" },
      "employee-rental",
      "",
      ["rental_maintenance_employee"],
      "branch-2",
    ).valid).toBe(false);
  });
});