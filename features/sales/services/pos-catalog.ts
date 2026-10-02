import type { ProductBranchStock, SaleProduct } from "@/features/products/types";

export type PosCatalogItem = SaleProduct & {
  stock?: ProductBranchStock;
  availableStock: number;
};

export function getPosStockLabel(availableStock: number): string {
  if (availableStock === 0) return "غير متوفر";
  if (availableStock === 1) return "متبقي آخر قطعة";
  return `متاح ${availableStock.toLocaleString("ar-EG-u-nu-latn")}`;
}

export function getPosCatalogItems({
  products,
  stocks,
  branchId,
  type,
  query,
}: {
  products: readonly SaleProduct[];
  stocks: readonly ProductBranchStock[];
  branchId: string;
  type: string;
  query: string;
}): PosCatalogItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return products
    .filter(
      (product) =>
        product.active &&
        (type === "all" || product.type === type) &&
        (!normalizedQuery ||
          `${product.name} ${product.sku} ${product.barcode}`
            .toLowerCase()
            .includes(normalizedQuery)),
    )
    .map((product) => {
      const stock = stocks.find(
        (item) => item.productId === product.id && item.branchId === branchId,
      );

      return {
        ...product,
        stock,
        availableStock: Math.max(
          0,
          (stock?.quantityAvailable ?? 0) - (stock?.quantityReserved ?? 0),
        ),
      };
    });
}
