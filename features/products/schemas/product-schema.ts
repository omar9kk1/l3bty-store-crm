import type { ProductFormValues, SaleProduct } from "../types";

export function validateProduct(values: ProductFormValues, products: readonly SaleProduct[], currentId?: string) {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = "اسم المنتج إلزامي.";
  if (!values.sku.trim()) errors.sku = "كود المنتج إلزامي.";
  if (!(["sale_toy", "spare_part"] as const).includes(values.type)) errors.type = "نوع المنتج غير مسموح.";
  if (values.type === "sale_toy" && !values.barcode.trim()) errors.barcode = "باركود المنتج إلزامي.";
  if (values.type === "sale_toy" && !values.imageMockKey.startsWith("data:image/")) errors.imageMockKey = "صورة المنتج إلزامية.";
  if (values.salePrice < 0) errors.salePrice = "سعر البيع لا يمكن أن يكون سالبًا.";
  if (values.costSnapshot < 0) errors.costSnapshot = "سعر الشراء لا يمكن أن يكون سالبًا.";
  if (values.taxRate < 0) errors.taxRate = "الضريبة لا يمكن أن تكون سالبة.";
  if (Object.values(values.openingStock).some((quantity) => quantity < 0)) errors.openingStock = "الكمية لا يمكن أن تكون سالبة.";
  if (products.some((item) => item.id !== currentId && item.sku.toLowerCase() === values.sku.trim().toLowerCase())) errors.sku = "كود المنتج مستخدم بالفعل.";
  if (values.barcode.trim() && products.some((item) => item.id !== currentId && item.barcode === values.barcode.trim())) errors.barcode = "الباركود مستخدم بالفعل.";
  return { valid: Object.keys(errors).length === 0, errors };
}
