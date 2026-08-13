import type { ProductFormValues, SaleProduct } from "../types";

export function validateProduct(values: ProductFormValues, products: readonly SaleProduct[], currentId?: string) {
  const errors: Record<string,string> = {};
  if (!values.name.trim()) errors.name = "اسم المنتج إلزامي.";
  if (!values.sku.trim()) errors.sku = "SKU إلزامي.";
  if (!(["sale_toy","spare_part"] as const).includes(values.type)) errors.type = "نوع المنتج غير مسموح.";
  if (values.salePrice < 0) errors.salePrice = "السعر لا يمكن أن يكون سالبًا.";
  if (values.costSnapshot < 0) errors.costSnapshot = "التكلفة لا يمكن أن تكون سالبة.";
  if (values.taxRate < 0) errors.taxRate = "الضريبة لا يمكن أن تكون سالبة.";
  if (Object.values(values.openingStock).some((quantity) => quantity < 0)) errors.openingStock = "الكمية لا يمكن أن تكون سالبة.";
  if (products.some((product) => product.id !== currentId && product.sku.toLowerCase() === values.sku.trim().toLowerCase())) errors.sku = "SKU مستخدم بالفعل.";
  if (values.barcode.trim() && products.some((product) => product.id !== currentId && product.barcode === values.barcode.trim())) errors.barcode = "Barcode مستخدم بالفعل.";
  return { valid:Object.keys(errors).length===0,errors };
}
