import type{InventoryMovementType}from"../types";
export const movementLabels:Record<InventoryMovementType,string>={opening_balance:"رصيد افتتاحي",purchase_receipt:"استلام شراء",sale:"بيع",sale_return:"مرتجع بيع",maintenance_issue:"صرف صيانة",maintenance_return:"رد صيانة",transfer_dispatch:"إرسال تحويل",transfer_receive:"استلام تحويل",adjustment_in:"تسوية إضافة",adjustment_out:"تسوية خصم",stock_count_difference:"فرق جرد",damaged:"تالف",written_off:"إعدام"};
export const inventoryMoney=(value:string|number)=>`${Number(value).toLocaleString("ar-EG-u-nu-latn",{minimumFractionDigits:2,maximumFractionDigits:2})} ج.م`;

const movementReferenceLabels: Record<string, string> = {
  "PRODUCT-CREATE": "إضافة المنتج",
  "PRODUCT-EDIT": "تعديل المنتج",
  "OPENING-MOCK": "رصيد افتتاحي",
};

export const inventoryMovementReferenceLabel = (reference: string) =>
  movementReferenceLabels[reference] ?? reference;

export const inventoryMovementPerformerLabel = (
  performerId: string,
  employeeName?: string,
) => employeeName ?? (performerId === "mock-seed" ? "النظام" : "مستخدم غير معروف");

export const inventoryBranchLabel = (
  branchId: string,
  branches: readonly { id: string; nameAr: string }[],
) => branches.find((branch) => branch.id === branchId)?.nameAr ?? "فرع غير معروف";

export const inventoryRestockItemLabel = (
  partName?: string,
  productName?: string,
) => partName ?? productName ?? "قطعة غير معروفة";

export const inventoryAdjustmentDifferenceLabel = (
  difference: number | null,
) => {
  if (difference === null) return "أدخل الكمية الفعلية";
  if (difference === 0) return "لا يوجد فرق";
  return difference > 0
    ? `زيادة ${difference.toLocaleString("ar-EG-u-nu-latn")}`
    : `نقص ${Math.abs(difference).toLocaleString("ar-EG-u-nu-latn")}`;
};
