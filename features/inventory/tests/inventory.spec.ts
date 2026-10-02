import { beforeEach, describe, expect, it } from "vitest";
import {
  commitMaintenancePartStock,
  commitReturnStock,
  commitSaleStock,
  getProductSnapshot,
  resetProductStore,
} from "@/features/products/services/product-store";
import {
  canAdjustInventory,
  canManageInventory,
  canViewAssetLocations,
  canViewInventoryCost,
  canViewSaleStock,
  canViewSparePartStock,
} from "../permissions";
import {
  adjustStock,
  calculateMovingWeightedAverage,
  getInventorySnapshot,
  receiveInventory,
  resetInventoryService,
} from "../services/inventory-service";
import {
  inventoryAdjustmentDifferenceLabel,
  inventoryBranchLabel,
  inventoryMovementPerformerLabel,
  inventoryMovementReferenceLabel,
  inventoryRestockItemLabel,
} from "../components/inventory-labels";
describe("inventory contracts", () => {
  beforeEach(() => {
    resetProductStore();
    resetInventoryService();
  });
  it("separates role views and sensitive cost fields", () => {
    expect(canViewInventoryCost(["owner"])).toBe(true);
    expect(canViewInventoryCost(["sales_employee"])).toBe(false);
    expect(canManageInventory(["owner"])).toBe(false);
    expect(canAdjustInventory(["owner"])).toBe(false);
    expect(canManageInventory(["manager"])).toBe(true);
    expect(canAdjustInventory(["manager"])).toBe(true);
    expect(canAdjustInventory(["maintenance_technician"])).toBe(false);
    expect(canViewSaleStock(["maintenance_technician"])).toBe(true);
    expect(canViewSparePartStock(["maintenance_technician"])).toBe(true);
    expect(canViewAssetLocations(["rental_maintenance_employee"])).toBe(true);
  });
  it("derives available quantity from on-hand minus reserved", () => {
    const balance = getInventorySnapshot().balances[0];
    expect(balance.quantityAvailable).toBe(
      balance.quantityOnHand - balance.quantityReserved,
    );
  });
  it("calculates moving weighted average using minor monetary units", () => {
    expect(calculateMovingWeightedAverage(10, "10.00", 10, "20.00")).toBe(
      "15.00",
    );
    const before = getInventorySnapshot().balances.find(
      (item) =>
        item.productId === "part-battery-12v" && item.branchId === "main",
    )!;
    expect(
      receiveInventory(
        "part-battery-12v",
        "main",
        10,
        "2050.00",
        "RECEIPT-1",
        "employee-manager",
        "receipt-1",
      ).valid,
    ).toBe(true);
    const after = getInventorySnapshot().balances.find(
      (item) => item.id === before.id,
    )!;
    expect(after.quantityOnHand).toBe(before.quantityOnHand + 10);
    expect(after.averageCost).toBe(
      calculateMovingWeightedAverage(
        before.quantityOnHand,
        before.averageCost,
        10,
        "2050.00",
      ),
    );
  });
  it("records sales, valid returns and maintenance issues as movements", () => {
    const before = getInventorySnapshot().balances.find(
      (item) =>
        item.productId === "part-battery-12v" && item.branchId === "main",
    )!.quantityOnHand;
    expect(
      commitSaleStock(
        [{ productId: "part-battery-12v", quantity: 1 }],
        "main",
        "SALE-TEST",
      ).valid,
    ).toBe(true);
    commitReturnStock("part-battery-12v", "main", 1, "RETURN-TEST", true);
    expect(
      commitMaintenancePartStock("part-battery-12v", "main", 1, "MNT-TEST")
        .valid,
    ).toBe(true);
    const snapshot = getInventorySnapshot();
    expect(
      snapshot.balances.find(
        (item) =>
          item.productId === "part-battery-12v" && item.branchId === "main",
      )?.quantityOnHand,
    ).toBe(before - 1);
    expect(snapshot.movements.map((item) => item.type)).toEqual(
      expect.arrayContaining(["sale", "sale_return", "maintenance_issue"]),
    );
  });
  it("never changes a balance silently during stock count", () => {
    const before = getInventorySnapshot().balances.find(
      (item) =>
        item.productId === "part-charger-12v" && item.branchId === "main",
    )!;
    expect(
      adjustStock({
        productId: before.productId,
        branchId: before.branchId,
        actualQuantity: before.quantityOnHand - 2,
        reason: "فرق عد فعلي",
        notes: "اختبار",
        performedByEmployeeId: "employee-manager",
        idempotencyKey: "count-test",
      }).valid,
    ).toBe(true);
    const snapshot = getInventorySnapshot();
    expect(snapshot.movements[0].type).toBe("stock_count_difference");
    expect(snapshot.audits[0]).toMatchObject({
      oldValue: String(before.quantityOnHand),
      newValue: String(before.quantityOnHand - 2),
    });
  });
  it("prevents stock from going below zero", () => {
    const stock = getProductSnapshot().stocks.find(
      (item) =>
        item.productId === "product-car-12v" && item.branchId === "main",
    )!;
    expect(
      commitSaleStock(
        [
          {
            productId: "product-car-12v",
            quantity: stock.quantityAvailable + 1,
          },
        ],
        "main",
        "OVER",
      ).valid,
    ).toBe(false);
  });
  it("shows readable Arabic labels for system product movements", () => {
    expect(inventoryMovementReferenceLabel("PRODUCT-CREATE")).toBe(
      "إضافة المنتج",
    );
    expect(inventoryMovementReferenceLabel("PRODUCT-EDIT")).toBe(
      "تعديل المنتج",
    );
    expect(inventoryMovementPerformerLabel("mock-seed")).toBe("النظام");
    expect(
      inventoryMovementPerformerLabel("employee-1", "أحمد"),
    ).toBe("أحمد");
    expect(inventoryMovementPerformerLabel("missing-employee")).toBe(
      "مستخدم غير معروف",
    );
  });
  it("shows the branch name instead of its internal identifier", () => {
    const branches = [
      { id: "branch-01", nameAr: "مول غازي" },
    ] as const;

    expect(inventoryBranchLabel("branch-01", branches)).toBe("مول غازي");
    expect(inventoryBranchLabel("unknown", branches)).toBe("فرع غير معروف");
  });
  it("never exposes an internal product id in restock requests", () => {
    expect(inventoryRestockItemLabel("بطارية سيارة", "اسم آخر")).toBe("بطارية سيارة");
    expect(inventoryRestockItemLabel(undefined, "شاحن")).toBe("شاحن");
    expect(inventoryRestockItemLabel()).toBe("قطعة غير معروفة");
  });
  it("describes stock-count differences clearly", () => {
    expect(inventoryAdjustmentDifferenceLabel(null)).toBe("أدخل الكمية الفعلية");
    expect(inventoryAdjustmentDifferenceLabel(0)).toBe("لا يوجد فرق");
    expect(inventoryAdjustmentDifferenceLabel(3)).toBe("زيادة 3");
    expect(inventoryAdjustmentDifferenceLabel(-2)).toBe("نقص 2");
  });
});
