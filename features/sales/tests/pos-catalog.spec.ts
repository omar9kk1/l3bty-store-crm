import { describe, expect, it } from "vitest";
import type { ProductBranchStock, SaleProduct } from "@/features/products/types";
import { getPosCatalogItems, getPosStockLabel } from "../services/pos-catalog";

const product: SaleProduct = {
  id: "product-new",
  sku: "NEW-1",
  barcode: "NEW-1",
  name: "لعبة جديدة",
  type: "sale_toy",
  category: "ألعاب للبيع",
  brand: "",
  description: "",
  salePrice: 250,
  costSnapshot: 150,
  taxRate: 0,
  active: true,
  imageMockKey: "data:image/png;base64,cHJvZHVjdA==",
  warrantyDays: 0,
  createdAt: "2026-08-23T00:00:00.000Z",
  updatedAt: "2026-08-23T00:00:00.000Z",
};

describe("POS catalog", () => {
  it("shows a clear warning when only one item remains", () => {
    expect(getPosStockLabel(0)).toBe("غير متوفر");
    expect(getPosStockLabel(1)).toBe("متبقي آخر قطعة");
    expect(getPosStockLabel(2)).toBe("متاح 2");
  });

  it("keeps a newly added active product visible before stock is supplied", () => {
    const result = getPosCatalogItems({ products: [product], stocks: [], branchId: "branch-01", type: "all", query: "" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: product.id, imageMockKey: product.imageMockKey, salePrice: 250, availableStock: 0 });
  });

  it("uses branch stock and subtracts reserved quantity", () => {
    const stocks: ProductBranchStock[] = [{
      productId: product.id,
      branchId: "branch-01",
      quantityAvailable: 5,
      quantityReserved: 2,
      minimumStock: 1,
      averageCost: 150,
      lastMovementAt: "2026-08-23T00:00:00.000Z",
    }];

    expect(getPosCatalogItems({ products: [product], stocks, branchId: "branch-01", type: "sale_toy", query: "NEW-1" })[0].availableStock).toBe(3);
  });
});
