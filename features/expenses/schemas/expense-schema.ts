import { toCents } from "@/lib/utils/money";
import type { ExpenseCategory, ExpenseRequestInput } from "../types";

export function validateExpenseRequest(input: ExpenseRequestInput, categories: readonly ExpenseCategory[]) {
  let amount = 0;
  try {
    amount = toCents(input.amount);
  } catch {
    return { valid: false, message: "أدخل تكلفة صحيحة." };
  }
  if (amount <= 0) return { valid: false, message: "يجب أن تكون التكلفة أكبر من صفر." };
  if (!input.assignedBranchIds.includes(input.branchId)) return { valid: false, message: "الفرع غير مسند للموظف." };
  const customCategory = input.categoryId.startsWith("custom:");
  const category = categories.find((item) => item.id === input.categoryId && item.active);
  if (customCategory) {
    if (!input.categoryName?.trim() || input.categoryName.trim().length < 2) return { valid: false, message: "اكتب نوع المصروف." };
  } else if (!category) {
    return { valid: false, message: "نوع المصروف غير متاح." };
  }
  if (input.description.trim().length < 3) return { valid: false, message: "اكتب ملاحظة واضحة للمصروف." };
  if (category?.requiresAttachment && !input.attachmentName?.trim()) return { valid: false, message: "صورة الإيصال مطلوبة لهذا النوع." };
  return { valid: true, message: "الطلب صحيح." };
}
