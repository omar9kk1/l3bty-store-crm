export type OvertimePricingMode = "same_rate" | "custom";
export type PrintSize = "80mm" | "58mm" | "a4";

export interface SystemSettings {
  reminderMinutes: number;
  selectionTrialMinutes: number;
  overtimePricing: OvertimePricingMode;
  employeeDiscountLimitPercent: number;
  defaultWarrantyDays: number;
  defaultMinimumStock: number;
  transferApprovalQuantityLimit: number;
  expenseApprovalLimit: number;
  requireShiftForCollection: boolean;
  defaultGeofenceRadiusMeters: number;
  maxLocationAccuracyMeters: number;
  overtimeStartsAfterMinutes: number;
  payrollCutoffDay: number;
  advanceLimitPercent: number;
  whatsappEnabled: boolean;
  defaultPrintSize: PrintSize;
  notificationsEnabled: boolean;
  sessionTimeoutMinutes: number;
  auditRetentionDays: number;
  requireSensitiveReason: boolean;
}

export interface SettingsAuditEvent {
  id: string;
  actorEmployeeId: string;
  changedKeys: readonly (keyof SystemSettings)[];
  reason: string;
  at: string;
}

export interface SettingsSnapshot {
  settings: SystemSettings;
  audits: readonly SettingsAuditEvent[];
  updatedAt: string;
  updatedBy: string;
}

export type SettingsValidationErrors = Partial<Record<keyof SystemSettings, string>>;