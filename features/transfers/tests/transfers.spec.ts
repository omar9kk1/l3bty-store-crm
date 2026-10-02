import { beforeEach, describe, expect, it } from "vitest";
import {
  getInventorySnapshot,
  resetInventoryService,
} from "@/features/inventory/services/inventory-service";
import { resetMaintenanceStore } from "@/features/maintenance/services/maintenance-store";
import {
  createBranchNeed,
  getBranchNeedsSnapshot,
  resetBranchNeedsStore,
  reviewBranchNeed,
} from "@/features/branch-needs/services/branch-needs-store";
import { resetProductStore } from "@/features/products/services/product-store";
import {
  getRentalSnapshot,
  resetRentalStore,
} from "@/features/rentals/services/rental-store";
import {
  allowedTransferTypes,
  canApproveTransfer,
  canCreateTransfer,
} from "../permissions";
import {
  approveTransfer,
  createTransfer,
  dispatchTransfer,
  getTransfersSnapshot,
  receiveTransfer,
  resetTransferStore,
  resolveTransferDifferences,
} from "../services/transfer-store";
const stockInput = (key: string, quantity = 2) => ({
  transferType: "branch_stock" as const,
  sourceLocationId: "main",
  destinationLocationId: "branch-2",
  requestedByEmployeeId: "employee-manager",
  reason: "احتياج الفرع",
  notes: "",
  items: [
    {
      itemType: "stock_product" as const,
      productId: "part-battery-12v",
      rentalAssetId: null,
      quantityRequested: quantity,
      conditionAtDispatch: "سليم",
      note: "",
    },
  ],
  relatedMaintenanceOrderId: "",
  idempotencyKey: key,
});
describe("transfer contracts", () => {
  beforeEach(() => {
    resetProductStore();
    resetRentalStore();
    resetMaintenanceStore();
    resetInventoryService();
    resetBranchNeedsStore();
    resetTransferStore();
  });
  it("applies explicit role scopes", () => {
    expect(canApproveTransfer(["manager"])).toBe(true);
    expect(canApproveTransfer(["owner"])).toBe(false);
    expect(canCreateTransfer(["owner"])).toBe(false);
    expect(canApproveTransfer(["sales_employee"])).toBe(false);
    expect(canCreateTransfer(["maintenance_technician"])).toBe(false);
    expect(canCreateTransfer(["sales_employee"])).toBe(false);
    expect(canCreateTransfer(["rental_maintenance_employee"])).toBe(false);
    expect(allowedTransferTypes(["maintenance_technician"])).not.toContain(
      "branch_stock",
    );
    expect(allowedTransferTypes(["sales_employee"])).toEqual(["branch_stock"]);
    expect(allowedTransferTypes(["owner"])).toContain("branch_stock");
  });
  it("rejects identical locations and above-available quantities", () => {
    expect(
      createTransfer({ ...stockInput("same"), destinationLocationId: "main" }, [
        "manager",
      ]).valid,
    ).toBe(false);
    expect(createTransfer(stockInput("over", 999), ["manager"]).valid).toBe(
      false,
    );
  });
  it("links one approved branch request and fulfills it after receipt", () => {
    const need = createBranchNeed({
      kind: "sales_item",
      branchId: "branch-2",
      requestedByEmployeeId: "employee-sales",
      itemName: "بطارية",
      quantity: 2,
      priority: "normal",
      reason: "نقص في الفرع",
    }).request!;
    expect(
      reviewBranchNeed(need.id, "approved", "employee-manager", "").valid,
    ).toBe(true);
    const linkedInput = {
      ...stockInput("linked-need"),
      items: [
        {
          ...stockInput("linked-item").items[0],
          productId: "product-car-12v",
        },
      ],
      relatedBranchNeedId: need.id,
    };
    const created = createTransfer(
      linkedInput,
      ["manager"],
    );
    expect(created.valid).toBe(true);
    expect(getBranchNeedsSnapshot().requests[0].transferId).toBe(
      created.transfer!.id,
    );
    expect(
      createTransfer(
        { ...linkedInput, idempotencyKey: "linked-need-again" },
        ["manager"],
      ).valid,
    ).toBe(false);
    expect(
      dispatchTransfer(created.transfer!.id, "employee-manager", ["manager"])
        .valid,
    ).toBe(true);
    const transfer = getTransfersSnapshot().transfers.find(
      (item) => item.id === created.transfer!.id,
    )!;
    expect(
      receiveTransfer(
        transfer.id,
        { [transfer.items[0].id]: 2 },
        { [transfer.items[0].id]: "سليم" },
        "employee-sales",
        "",
        ["sales_employee"],
        "branch-2",
      ).valid,
    ).toBe(true);
    expect(getBranchNeedsSnapshot().requests[0].status).toBe("fulfilled");
  });
  it("deducts on dispatch and adds to destination once on receipt", () => {
    const sourceBefore = getInventorySnapshot().balances.find(
      (item) =>
        item.productId === "part-battery-12v" && item.branchId === "main",
    )!.quantityOnHand;
    const destinationBefore = getInventorySnapshot().balances.find(
      (item) =>
        item.productId === "part-battery-12v" && item.branchId === "branch-2",
    )!.quantityOnHand;
    const created = createTransfer(stockInput("flow"), ["manager"]);
    expect(created.valid).toBe(true);
    const transfer = created.transfer!;
    expect(dispatchTransfer(transfer.id, "employee-manager").valid).toBe(true);
    let snapshot = getInventorySnapshot();
    expect(
      snapshot.balances.find(
        (item) =>
          item.productId === "part-battery-12v" && item.branchId === "main",
      )?.quantityOnHand,
    ).toBe(sourceBefore - 2);
    expect(
      snapshot.balances.find(
        (item) =>
          item.productId === "part-battery-12v" && item.branchId === "branch-2",
      )?.quantityOnHand,
    ).toBe(destinationBefore);
    const item = getTransfersSnapshot().transfers.find(
      (value) => value.id === transfer.id,
    )!.items[0];
    expect(
      receiveTransfer(
        transfer.id,
        { [item.id]: 2 },
        { [item.id]: "سليم" },
        "employee-manager",
        "",
      ).valid,
    ).toBe(true);
    snapshot = getInventorySnapshot();
    expect(
      snapshot.balances.find(
        (value) =>
          value.productId === "part-battery-12v" &&
          value.branchId === "branch-2",
      )?.quantityOnHand,
    ).toBe(destinationBefore + 2);
    expect(
      receiveTransfer(transfer.id, { [item.id]: 2 }, {}, "employee-manager", "")
        .valid,
    ).toBe(false);
  });
  it("holds partial receipt for difference review", () => {
    const created = createTransfer(stockInput("difference", 2), ["manager"]);
    dispatchTransfer(created.transfer!.id, "employee-manager");
    const transfer = getTransfersSnapshot().transfers.find(
      (item) => item.id === created.transfer!.id,
    )!;
    expect(
      receiveTransfer(
        transfer.id,
        { [transfer.items[0].id]: 1 },
        {},
        "employee-manager",
        "نقص قطعة عند الفتح",
      ).valid,
    ).toBe(true);
    expect(
      getTransfersSnapshot().transfers.find((item) => item.id === transfer.id)
        ?.status,
    ).toBe("difference_review");
    expect(
      resolveTransferDifferences(
        transfer.id,
        ["sales_employee"],
        "employee-sales",
        "accept_loss",
        "محاولة",
      ).valid,
    ).toBe(false);
    expect(
      resolveTransferDifferences(
        transfer.id,
        ["manager"],
        "employee-manager",
        "accept_loss",
        "اعتماد العجز",
      ).valid,
    ).toBe(true);
  });
  it("blocks rented assets and duplicate active asset transfers", () => {
    const rented = {
      transferType: "rental_asset" as const,
      sourceLocationId: "main",
      destinationLocationId: "branch-2",
      requestedByEmployeeId: "employee-manager",
      reason: "نقل أصل",
      notes: "",
      items: [
        {
          itemType: "rental_asset" as const,
          productId: null,
          rentalAssetId: "asset-drift-01",
          quantityRequested: 1,
          conditionAtDispatch: "سليم",
          note: "",
        },
      ],
      relatedMaintenanceOrderId: "",
      idempotencyKey: "asset-rented",
    };
    expect(createTransfer(rented, ["manager"]).valid).toBe(false);
    expect(
      createTransfer(
        {
          ...rented,
          items: [{ ...rented.items[0], rentalAssetId: "asset-scooter-01" }],
          idempotencyKey: "asset-duplicate",
        },
        ["manager"],
      ).valid,
    ).toBe(false);
  });
  it("updates one asset location through dispatch and receipt", () => {
    const input = {
      transferType: "rental_asset" as const,
      sourceLocationId: "main",
      destinationLocationId: "branch-2",
      requestedByEmployeeId: "employee-manager",
      reason: "نقل أصل خارج الخدمة",
      notes: "",
      items: [
        {
          itemType: "rental_asset" as const,
          productId: null,
          rentalAssetId: "asset-electric-car-retired",
          quantityRequested: 1,
          conditionAtDispatch: "موثق",
          note: "",
        },
      ],
      relatedMaintenanceOrderId: "",
      idempotencyKey: "asset-flow",
    };
    const created = createTransfer(input, ["manager"]);
    expect(created.valid).toBe(true);
    approveTransfer(
      created.transfer!.id,
      ["manager"],
      "employee-manager",
      "اعتماد",
      true,
    );
    expect(
      dispatchTransfer(created.transfer!.id, "employee-manager").valid,
    ).toBe(true);
    expect(
      getRentalSnapshot().assets.find(
        (item) => item.id === "asset-electric-car-retired",
      )?.currentLocationId,
    ).toBe("in_transit");
    const transfer = getTransfersSnapshot().transfers.find(
      (item) => item.id === created.transfer!.id,
    )!;
    receiveTransfer(
      transfer.id,
      { [transfer.items[0].id]: 1 },
      {},
      "employee-manager",
      "",
    );
    const asset = getRentalSnapshot().assets.find(
      (item) => item.id === "asset-electric-car-retired",
    )!;
    expect(asset.branchId).toBe("branch-2");
    expect(asset.currentLocationId).toBe("branch-2");
    expect(asset.status).toBe("out_of_service");
  });
});
