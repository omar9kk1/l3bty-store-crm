import type { Branch, BranchFormValidation, BranchFormValues } from "../types";

export const EMPTY_BRANCH_FORM: BranchFormValues = {
  name: "", code: "", type: "branch", status: "active", phone: "", alternatePhone: "",
  city: "", area: "", address: "", managerEmployeeId: "unassigned", latitude: "0", longitude: "0",
  geofenceRadiusMeters: "150", opensAt: "10:00", closesAt: "22:00", crossesMidnight: false,
  notes: "", statusReason: "",
};

export function normalizeBranchCode(code: string) {
  return code.trim().toUpperCase();
}

export function getNextBranchCode(branches: readonly Branch[]) {
  const highestSequence = branches.reduce((highest, branch) => {
    const match = /^BR(\d+)$/.exec(normalizeBranchCode(branch.code));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `BR${String(highestSequence + 1).padStart(2, "0")}`;
}

export function findDuplicateBranchCode(code: string, branches: readonly Branch[], excludedBranchId?: string) {
  const normalized = normalizeBranchCode(code);
  return branches.find((branch) => branch.id !== excludedBranchId && normalizeBranchCode(branch.code) === normalized);
}

export function validateBranchForm(values: BranchFormValues, branches: readonly Branch[], currentBranch?: Branch): BranchFormValidation {
  const normalizedValues: BranchFormValues = {
    ...values,
    name: values.name.trim(), code: normalizeBranchCode(values.code), phone: values.phone.replace(/[^\d+]/g, ""),
    alternatePhone: values.alternatePhone.replace(/[^\d+]/g, ""), city: values.city.trim(), area: values.area.trim(),
    address: values.address.trim(), notes: values.notes.trim(), statusReason: values.statusReason.trim(),
    latitude: values.latitude.trim(), longitude: values.longitude.trim(), geofenceRadiusMeters: values.geofenceRadiusMeters.trim(),
  };
  const errors: BranchFormValidation["errors"] = {};
  if (normalizedValues.name.length < 2) errors.name = "أدخل اسم الفرع أو الموقع.";
  if (!normalizedValues.code) errors.code = "أدخل كود الفرع.";
  else if (!/^[A-Z0-9]+$/.test(normalizedValues.code)) errors.code = "استخدم حروفًا إنجليزية وأرقامًا فقط دون مسافات.";
  const duplicate = findDuplicateBranchCode(normalizedValues.code, branches, currentBranch?.id);
  if (duplicate) errors.code = "كود الفرع مستخدم لموقع موجود.";
  if (!normalizedValues.city) errors.city = "أدخل المدينة.";
  const latitude = Number(normalizedValues.latitude);
  const longitude = Number(normalizedValues.longitude);
  const radius = Number(normalizedValues.geofenceRadiusMeters);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = "خط العرض يجب أن يكون بين -90 و90.";
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = "خط الطول يجب أن يكون بين -180 و180.";
  if (!Number.isFinite(radius) || radius < 25 || radius > 2000) errors.geofenceRadiusMeters = "النطاق يجب أن يكون بين 25 و2000 متر.";
  if (!normalizedValues.opensAt) errors.opensAt = "أدخل وقت الفتح.";
  if (!normalizedValues.closesAt) errors.closesAt = "أدخل وقت الإغلاق.";
  if (normalizedValues.opensAt && normalizedValues.closesAt) {
    if (normalizedValues.opensAt === normalizedValues.closesAt) errors.closesAt = "وقت الإغلاق يجب أن يختلف عن وقت الفتح.";
    else if (!normalizedValues.crossesMidnight && normalizedValues.closesAt < normalizedValues.opensAt) errors.closesAt = "فعّل خيار عبور منتصف الليل لهذا الموعد.";
  }
  if (currentBranch && currentBranch.status !== normalizedValues.status && !normalizedValues.statusReason) {
    errors.statusReason = "اكتب سبب تغيير حالة الموقع.";
  }
  return { valid: Object.keys(errors).length === 0, errors, duplicate, normalizedValues };
}
