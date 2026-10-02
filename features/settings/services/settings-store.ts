import { DEFAULT_SYSTEM_SETTINGS } from "../fixtures";
import type { SettingsSnapshot, SettingsValidationErrors, SystemSettings } from "../types";

const NOW = "2026-08-08T13:30:00+03:00";
let settings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
let audits: SettingsSnapshot["audits"] = [];
let sequence = 1;
let snapshot: SettingsSnapshot = { settings, audits, updatedAt: NOW, updatedBy: "employee-owner" };
const listeners = new Set<() => void>();

const ranges: Partial<Record<keyof SystemSettings, readonly [number, number]>> = {
  reminderMinutes: [1, 60],
  selectionTrialMinutes: [0, 60],
  employeeDiscountLimitPercent: [0, 100],
  defaultWarrantyDays: [0, 3650],
  defaultMinimumStock: [0, 100_000],
  transferApprovalQuantityLimit: [1, 10_000],
  expenseApprovalLimit: [0, 100_000_000],
  defaultGeofenceRadiusMeters: [25, 2000],
  maxLocationAccuracyMeters: [1, 500],
  overtimeStartsAfterMinutes: [0, 1440],
  payrollCutoffDay: [1, 28],
  advanceLimitPercent: [0, 100],
  sessionTimeoutMinutes: [5, 1440],
  auditRetentionDays: [30, 3650],
};

function emit() {
  snapshot = { ...snapshot, settings, audits };
  listeners.forEach((listener) => listener());
}

export function validateSystemSettings(input: SystemSettings) {
  const errors: SettingsValidationErrors = {};
  for (const [key, range] of Object.entries(ranges) as [keyof SystemSettings, readonly [number, number]][]) {
    const value = input[key];
    const [min, max] = range;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      errors[key] = "القيمة يجب أن تكون بين " + min + " و" + max + ".";
    }
  }
  if (!["same_rate", "custom"].includes(input.overtimePricing)) errors.overtimePricing = "اختر سياسة وقت إضافي صحيحة.";
  if (!["80mm", "58mm", "a4"].includes(input.defaultPrintSize)) errors.defaultPrintSize = "اختر مقاس طباعة صحيحًا.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function subscribeSettingsStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getSettingsSnapshot() { return snapshot; }

export function saveSystemSettings(input: SystemSettings, actorEmployeeId: string, reason = "تحديث سياسات النظام") {
  const validation = validateSystemSettings(input);
  if (!validation.valid) return { valid: false as const, errors: validation.errors, message: "راجع القيم غير الصحيحة قبل الحفظ." };
  const changedKeys = (Object.keys(input) as (keyof SystemSettings)[]).filter((key) => input[key] !== settings[key]);
  if (!changedKeys.length) return { valid: true as const, changedKeys, message: "لا توجد تغييرات جديدة للحفظ." };
  settings = { ...input };
  audits = [{
    id: "settings-audit-" + sequence++,
    actorEmployeeId,
    changedKeys,
    reason,
    at: NOW,
  }, ...audits];
  snapshot = { settings, audits, updatedAt: NOW, updatedBy: actorEmployeeId };
  emit();
  return { valid: true as const, changedKeys, message: "تم حفظ " + changedKeys.length + " إعدادًا وتسجيل التغيير." };
}

export function restoreDefaultSystemSettings(actorEmployeeId: string) {
  const result = saveSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS }, actorEmployeeId, "إعادة الإعدادات إلى القيم الافتراضية");
  return { ...result, message: result.changedKeys?.length ? "تمت إعادة الإعدادات الافتراضية وتسجيل التغيير." : "الإعدادات تستخدم القيم الافتراضية بالفعل." };
}

export function resetSettingsStore() {
  settings = { ...DEFAULT_SYSTEM_SETTINGS };
  audits = [];
  sequence = 1;
  snapshot = { settings, audits, updatedAt: NOW, updatedBy: "employee-owner" };
  emit();
}
