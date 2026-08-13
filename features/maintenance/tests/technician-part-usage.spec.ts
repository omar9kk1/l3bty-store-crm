import { beforeEach, describe, expect, it } from "vitest";
import { getInventorySnapshot, resetInventoryService } from "@/features/inventory/services/inventory-service";
import { resetProductStore } from "@/features/products/services/product-store";
import { issuePart, requestPart, resetMaintenanceStore, getMaintenanceSnapshot } from "../services/maintenance-store";

describe("technician part usage", () => {
  beforeEach(() => {
    resetProductStore();
    resetInventoryService();
    resetMaintenanceStore();
  });

  it("links the used part to the order and deducts workshop stock", () => {
    const before = getInventorySnapshot().balances.find((item) => item.productId === "part-battery-12v" && item.branchId === "workshop")!.quantityOnHand;
    const requested = requestPart("maintenance-order-8", "part-battery-12v", 1, "employee-technician", "استبدال بعد التشخيص");
    expect(requested.valid).toBe(true);
    const usage = getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-8")!.partUsages[0];
    expect(usage.locationId).toBe("workshop");
    expect(issuePart("maintenance-order-8", usage.id, 1, "employee-technician").valid).toBe(true);
    expect(getInventorySnapshot().balances.find((item) => item.productId === "part-battery-12v" && item.branchId === "workshop")?.quantityOnHand).toBe(before - 1);
    expect(getMaintenanceSnapshot().orders.find((item) => item.id === "maintenance-order-8")?.partUsages[0]).toMatchObject({
      status: "issued",
      issuedBy: "employee-technician",
      quantityIssued: 1,
    });
  });
});
