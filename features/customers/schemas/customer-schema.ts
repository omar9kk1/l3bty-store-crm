import type { Customer, CustomerFormValidation, CustomerFormValues } from "../types";
import { findDuplicateCustomer } from "../services/find-duplicate-customer";
import { normalizePhone } from "../services/normalize-phone";

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  name: "",
  primaryPhone: "",
  alternatePhone: "",
  branchId: "",
  notes: "",
};

export function validateCustomerForm(
  values: CustomerFormValues,
  customers: readonly Customer[],
  currentCustomerId?: string,
): CustomerFormValidation {
  const normalizedValues = {
    name: values.name.trim(),
    primaryPhone: normalizePhone(values.primaryPhone),
    alternatePhone: normalizePhone(values.alternatePhone),
    branchId: values.branchId,
    notes: values.notes.trim(),
  };
  const errors: CustomerFormValidation["errors"] = {};

  if (normalizedValues.name.length < 2) errors.name = "أدخل اسم العميل.";
  if (!/^01\d{9}$/.test(normalizedValues.primaryPhone)) {
    errors.primaryPhone = "أدخل رقم هاتف محمول صحيحًا من 11 رقمًا.";
  }
  if (normalizedValues.alternatePhone && !/^01\d{9}$/.test(normalizedValues.alternatePhone)) {
    errors.alternatePhone = "أدخل رقمًا بديلًا صحيحًا أو اترك الحقل فارغًا.";
  }
  if (normalizedValues.alternatePhone === normalizedValues.primaryPhone && normalizedValues.alternatePhone) {
    errors.alternatePhone = "يجب أن يختلف الرقم البديل عن الرقم الأساسي.";
  }
  if (!normalizedValues.branchId) errors.branchId = "اختر الفرع.";

  const duplicate = findDuplicateCustomer(
    normalizedValues.primaryPhone,
    customers,
    currentCustomerId,
  );
  if (duplicate) errors.primaryPhone = "رقم الهاتف مسجل لعميل موجود.";

  const alternateDuplicate = normalizedValues.alternatePhone
    ? findDuplicateCustomer(normalizedValues.alternatePhone, customers, currentCustomerId)
    : undefined;
  if (alternateDuplicate) errors.alternatePhone = "الرقم البديل مسجل لعميل موجود.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    duplicate: duplicate ?? alternateDuplicate,
    normalizedValues,
  };
}
