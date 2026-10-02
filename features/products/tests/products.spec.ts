import { beforeEach, describe, expect, it } from "vitest";
import { PRODUCT_FIXTURES } from "../fixtures";
import { validateProduct } from "../schemas/product-schema";
import { commitSaleStock, getProductSnapshot, resetProductStore, saveProduct } from "../services/product-store";
import type { ProductFormValues } from "../types";

const values: ProductFormValues = {
  sku: "NEW-SKU",
  barcode: "622299999999",
  name: "منتج تجريبي",
  type: "spare_part",
  category: "قطع غيار",
  brand: "L3BTY",
  description: "اختبار",
  salePrice: 100,
  costSnapshot: 70,
  taxRate: 0,
  active: true,
  imageMockKey: "part",
  warrantyDays: 0,
  openingStock: { main: 1 },
  minimumStock: 1,
};

describe("sale products catalog", () => {
  beforeEach(resetProductStore);

  it("contains only approved sale toys and spare parts", () => {
    expect(PRODUCT_FIXTURES.every((product) => ["sale_toy", "spare_part"].includes(product.type))).toBe(true);
    const searchable = PRODUCT_FIXTURES.map((product) => `${product.name} ${product.category}`).join(" ").toLowerCase();
    for (const forbidden of ["chips", "snack", "drink", "console", "rental_asset"]) expect(searchable).not.toContain(forbidden);
  });

  it("enforces unique identifiers and nonnegative values", () => {
    expect(validateProduct({ ...values, sku: PRODUCT_FIXTURES[0].sku }, PRODUCT_FIXTURES).valid).toBe(false);
    expect(validateProduct({ ...values, barcode: PRODUCT_FIXTURES[0].barcode }, PRODUCT_FIXTURES).valid).toBe(false);
    expect(validateProduct({ ...values, salePrice: -1 }, PRODUCT_FIXTURES).valid).toBe(false);
    expect(validateProduct({ ...values, openingStock: { main: -1 } }, PRODUCT_FIXTURES).valid).toBe(false);
  });

  it("requires a barcode and image for every sales product", () => {
    const saleProduct = { ...values, type: "sale_toy" as const, imageMockKey: "data:image/png;base64,cHJvZHVjdA==" };
    expect(validateProduct({ ...saleProduct, barcode: "" }, PRODUCT_FIXTURES).valid).toBe(false);
    expect(validateProduct({ ...saleProduct, imageMockKey: "" }, PRODUCT_FIXTURES).valid).toBe(false);
    expect(validateProduct(saleProduct, PRODUCT_FIXTURES).valid).toBe(true);
  });

  it("never permits stock to fall below zero", () => {
    const before = getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")!;
    expect(commitSaleStock([{ productId: "product-car-12v", quantity: before.quantityAvailable + 1 }], "main", "TEST").valid).toBe(false);
    expect(getProductSnapshot().stocks.find((stock) => stock.productId === "product-car-12v" && stock.branchId === "main")?.quantityAvailable).toBe(before.quantityAvailable);
  });

  it("updates a product's available quantity and records the difference", () => {
    const created = saveProduct(values);
    expect(created.valid).toBe(true);

    const updated = saveProduct({ ...values, openingStock: { main: 4 } }, created.product!.id);
    expect(updated.valid).toBe(true);
    expect(getProductSnapshot().stocks.find((stock) => stock.productId === created.product!.id && stock.branchId === "main")?.quantityAvailable).toBe(4);
    expect(getProductSnapshot().movements.find((movement) => movement.productId === created.product!.id && movement.type === "adjustment")?.quantity).toBe(3);
  });
});
