export type SaleProductType = "sale_toy" | "spare_part";

export interface SaleProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  type: SaleProductType;
  category: string;
  brand: string;
  description: string;
  salePrice: number;
  costSnapshot: number;
  taxRate: number;
  active: boolean;
  imageMockKey: string;
  warrantyDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBranchStock {
  productId: string;
  branchId: string;
  quantityAvailable: number;
  quantityReserved: number;
  minimumStock: number;
  averageCost: number;
  lastMovementAt: string;
}

export interface ProductStockMovement {
  id: string;
  productId: string;
  branchId: string;
  type: "opening" | "sale" | "sale_return" | "exchange_out" | "damaged_return" | "maintenance_issue" | "maintenance_return" | "adjustment" | "purchase_receipt" | "transfer_dispatch" | "transfer_receive" | "adjustment_in" | "adjustment_out" | "stock_count_difference" | "damaged" | "written_off";
  quantity: number;
  reference: string;
  reason: string;
  at: string;
  unitCost?: number;
  performedByEmployeeId?: string;
  idempotencyKey?: string;
}

export interface ProductFormValues {
  name: string;
  type: SaleProductType;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  description: string;
  salePrice: number;
  costSnapshot: number;
  taxRate: number;
  warrantyDays: number;
  active: boolean;
  imageMockKey: string;
  openingStock: Record<string, number>;
  minimumStock: number;
}
