import type { SystemSettings } from "./types";

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  reminderMinutes: 5,
  selectionTrialMinutes: 5,
  overtimePricing: "same_rate",
  employeeDiscountLimitPercent: 10,
  defaultWarrantyDays: 30,
  defaultMinimumStock: 1,
  transferApprovalQuantityLimit: 10,
  expenseApprovalLimit: 3000,
  requireShiftForCollection: true,
  defaultGeofenceRadiusMeters: 150,
  maxLocationAccuracyMeters: 100,
  overtimeStartsAfterMinutes: 30,
  payrollCutoffDay: 28,
  advanceLimitPercent: 30,
  whatsappEnabled: true,
  defaultPrintSize: "80mm",
  notificationsEnabled: true,
  sessionTimeoutMinutes: 60,
  auditRetentionDays: 365,
  requireSensitiveReason: true,
};