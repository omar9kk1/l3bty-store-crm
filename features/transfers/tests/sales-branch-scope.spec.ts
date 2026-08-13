import { beforeEach, describe, expect, it } from "vitest";
import { getInventorySnapshot, resetInventoryService } from "@/features/inventory/services/inventory-service";
import { resetMaintenanceStore } from "@/features/maintenance/services/maintenance-store";
import { resetProductStore } from "@/features/products/services/product-store";
import { resetRentalStore } from "@/features/rentals/services/rental-store";
import { canDispatchTransfer, canReceiveTransfer } from "../permissions";
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

const salesRequest = (
  key: string,
  productId = "product-car-12v",
  destinationLocationId = "branch-2",
): CreateTransferInput => ({
  transferType: "branch_stock",
  sourceLocationId: "main",
  destinationLocationId,
  requestedByEmployeeId: "employee-sales",
  reason: "Restock sale toys for the active branch",
  notes: "",
  items: [{
    itemType: "stock_product",
    productId,
    rentalAssetId: null,
    quantityRequested: 1,
    conditionAtDispatch: "New",
    note: "",
  }],
  relatedMaintenanceOrderId: "",
  idempotencyKey: key,
});

describe("sales branch transfer scope", () => {
  beforeEach(() => {
    resetProductStore();
    resetRentalStore();
    resetMaintenanceStore();
    resetInventoryService();
    resetTransferStore();
  });

  it("allows sale-toy requests only for the active branch", () => {
    expect(createTransfer(salesRequest("sales-valid"), ["sales_employee"], "branch-2").valid).toBe(true);
    expect(createTransfer(salesRequest("sales-other-branch", "product-car-12v", "branch-3"), ["sales_employee"], "branch-2").valid).toBe(false);
    expect(createTransfer(salesRequest("sales-spare-part", "part-battery-12v"), ["sales_employee"], "branch-2").valid).toBe(false);
  });

  it("lets sales receive an incoming sale-toy transfer but never dispatch it", () => {
    const destinationBefore = getInventorySnapshot().balances.find(
      (item) => item.productId === "product-car-12v" && item.branchId === "branch-2",
    )!.quantityOnHand;
    const created = createTransfer(salesRequest("sales-flow"), ["sales_employee"], "branch-2");
    expect(created.transfer?.status).toBe("pending_approval");
    expect(dispatchTransfer(created.transfer!.id, "employee-sales", ["sales_employee"]).valid).toBe(false);
    expect(approveTransfer(created.transfer!.id, ["manager"], "employee-manager", "Approved").valid).toBe(true);
    expect(dispatchTransfer(created.transfer!.id, "employee-manager", ["manager"]).valid).toBe(true);

    const transfer = getTransfersSnapshot().transfers.find((item) => item.id === created.transfer!.id)!;
    expect(canDispatchTransfer(["sales_employee"], transfer, new Set(["branch-2"]))).toBe(false);
    expect(canReceiveTransfer(["sales_employee"], transfer, new Set(["branch-2"]))).toBe(true);
    expect(canReceiveTransfer(["sales_employee"], transfer, new Set(["main"]))).toBe(false);
    expect(receiveTransfer(
      transfer.id,
      { [transfer.items[0].id]: 1 },
      { [transfer.items[0].id]: "Good" },
      "employee-sales",
      "",
      ["sales_employee"],
      "main",
    ).valid).toBe(false);
    expect(receiveTransfer(
      transfer.id,
      { [transfer.items[0].id]: 1 },
      { [transfer.items[0].id]: "Good" },
      "employee-sales",
      "",
      ["sales_employee"],
      "branch-2",
    ).valid).toBe(true);
    expect(getInventorySnapshot().balances.find(
      (item) => item.productId === "product-car-12v" && item.branchId === "branch-2",
    )?.quantityOnHand).toBe(destinationBefore + 1);
  });

  it("prevents sales from cancelling after management approval", () => {
    const created = createTransfer(salesRequest("sales-cancel"), ["sales_employee"], "branch-2");
    expect(approveTransfer(created.transfer!.id, ["manager"], "employee-manager", "Approved").valid).toBe(true);
    expect(cancelTransfer(created.transfer!.id, ["sales_employee"], "employee-sales", "Changed need").valid).toBe(false);
  });
});