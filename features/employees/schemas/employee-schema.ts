import { normalizePhone } from "@/features/customers/services/normalize-phone";
import { ROLE_IDS, type RoleId } from "@/permissions/types";
import type { Employee, EmployeeFormValidation, EmployeeFormValues } from "../types";

export const EMPTY_EMPLOYEE_FORM: EmployeeFormValues = { employeeNumber: "", name: "", phone: "", alternatePhone: "", email: "", nationalIdLast4: "", jobTitle: "", status: "active", primaryBranchId: "", assignedBranchIds: [], roleKeys: [], hireDate: "2026-08-05", employmentType: "full_time", emergencyContactName: "", emergencyContactPhone: "", address: "", notes: "", adminAccessConfirmed: false, adminAccessReason: "", statusReason: "" };

export interface EmployeeValidationContext {
  currentEmployeeId?: string;
  currentPreviewEmployeeId?: string;
}

export function validateEmployeeForm(values: EmployeeFormValues, employees: readonly Employee[], context: EmployeeValidationContext = {}): EmployeeFormValidation {
  const normalizedValues: EmployeeFormValues = { ...values, employeeNumber: values.employeeNumber.trim().toUpperCase(), name: values.name.trim(), phone: normalizePhone(values.phone), alternatePhone: normalizePhone(values.alternatePhone), email: values.email.trim().toLowerCase(), nationalIdLast4: values.nationalIdLast4.replace(/\D/g, "").slice(-4), jobTitle: values.jobTitle.trim(), assignedBranchIds: [...new Set(values.assignedBranchIds)], roleKeys: [...new Set(values.roleKeys)], emergencyContactName: values.emergencyContactName.trim(), emergencyContactPhone: normalizePhone(values.emergencyContactPhone), address: values.address.trim(), notes: values.notes.trim(), adminAccessReason: values.adminAccessReason.trim(), statusReason: values.statusReason.trim() };
  const errors: EmployeeFormValidation["errors"] = {};
  if (normalizedValues.name.length < 2) errors.name = "أدخل اسم الموظف.";
  if (!/^01\d{9}$/.test(normalizedValues.phone)) errors.phone = "أدخل رقم هاتف محمول صحيحًا من 11 رقمًا.";
  if (normalizedValues.alternatePhone && !/^01\d{9}$/.test(normalizedValues.alternatePhone)) errors.alternatePhone = "أدخل رقمًا بديلًا صحيحًا.";
  if (!/^EMP-[A-Z0-9]{4,}$/.test(normalizedValues.employeeNumber)) errors.employeeNumber = "استخدم رقمًا مثل EMP-0008.";
  if (!normalizedValues.jobTitle) errors.jobTitle = "أدخل المسمى الوظيفي.";
  if (!normalizedValues.hireDate) errors.hireDate = "اختر تاريخ التعيين.";
  if (normalizedValues.email && !/^\S+@\S+\.\S+$/.test(normalizedValues.email)) errors.email = "أدخل بريدًا صحيحًا.";
  if (normalizedValues.nationalIdLast4 && !/^\d{4}$/.test(normalizedValues.nationalIdLast4)) errors.nationalIdLast4 = "أدخل آخر 4 أرقام فقط.";
  const unknownRole = normalizedValues.roleKeys.find((role) => !ROLE_IDS.includes(role as RoleId));
  if (unknownRole) errors.roleKeys = "يوجد دور غير معتمد. استخدم الأدوار الخمسة فقط.";
  if (normalizedValues.roleKeys.length === 0) errors.roleKeys = "اختر دورًا فعالًا واحدًا على الأقل.";
  const hasAdminRole = normalizedValues.roleKeys.some((role) => role === "owner" || role === "manager");
  const hasOperationalRole = normalizedValues.roleKeys.some((role) => role !== "owner" && role !== "manager" && ROLE_IDS.includes(role as RoleId));
  if (hasOperationalRole && normalizedValues.assignedBranchIds.length === 0) errors.assignedBranchIds = "اختر فرعًا واحدًا على الأقل للدور التشغيلي.";
  if (!hasAdminRole && normalizedValues.primaryBranchId && !normalizedValues.assignedBranchIds.includes(normalizedValues.primaryBranchId)) errors.primaryBranchId = "يجب أن يكون الفرع الأساسي ضمن الفروع المسندة.";
  if (!normalizedValues.primaryBranchId) errors.primaryBranchId = "اختر الفرع الأساسي.";
  if (hasAdminRole && (!normalizedValues.adminAccessConfirmed || normalizedValues.adminAccessReason.length < 5)) errors.adminAccessReason = "أكد الوصول الكامل واكتب سببًا واضحًا.";
  const current = context.currentEmployeeId ? employees.find((employee) => employee.id === context.currentEmployeeId) : undefined;
  if (current && current.status !== normalizedValues.status && !normalizedValues.statusReason) errors.statusReason = "اكتب سبب تغيير الحالة.";
  if (context.currentEmployeeId === context.currentPreviewEmployeeId && normalizedValues.status !== "active") errors.status = "لا يمكنك إيقاف أو تعطيل المستخدم الحالي.";
  const currentIsOwner = current?.roleAssignments.some((assignment) => assignment.active && assignment.roleKey === "owner");
  const keepsOwner = normalizedValues.roleKeys.includes("owner");
  const otherOwners = employees.filter((employee) => employee.id !== context.currentEmployeeId && employee.roleAssignments.some((assignment) => assignment.active && assignment.roleKey === "owner"));
  if (currentIsOwner && !keepsOwner && otherOwners.length === 0) errors.roleKeys = "لا يمكن إزالة آخر مالك موجود في النظام.";
  const duplicate = employees.find((employee) => employee.id !== context.currentEmployeeId && (employee.phone === normalizedValues.phone || employee.employeeNumber.toUpperCase() === normalizedValues.employeeNumber));
  if (duplicate?.phone === normalizedValues.phone) errors.phone = "رقم الهاتف مسجل لموظف موجود.";
  if (duplicate?.employeeNumber.toUpperCase() === normalizedValues.employeeNumber) errors.employeeNumber = "رقم الموظف مستخدم بالفعل.";
  return { valid: Object.keys(errors).length === 0, errors, duplicate, normalizedValues };
}
