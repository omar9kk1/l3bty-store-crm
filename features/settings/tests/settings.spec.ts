import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SYSTEM_SETTINGS } from "../fixtures";
import { RENTAL_FIXTURES } from "@/features/rentals/fixtures";
import { MOCK_SERVER_TIME } from "@/features/rentals/services/rental-rules";
import { evaluateFiveMinuteReminder } from "@/features/rentals/services/rental-reminder-service";
import { getSettingsSnapshot, resetSettingsStore, restoreDefaultSystemSettings, saveSystemSettings, validateSystemSettings } from "../services/settings-store";

describe("settings store", () => {
  beforeEach(() => resetSettingsStore());

  it("starts with the policies currently used by the mock application", () => {
    expect(getSettingsSnapshot().settings.reminderMinutes).toBe(5);
    expect(getSettingsSnapshot().settings.employeeDiscountLimitPercent).toBe(10);
    expect(getSettingsSnapshot().settings.transferApprovalQuantityLimit).toBe(10);
  });

  it("validates ranges before saving", () => {
    const invalid = { ...DEFAULT_SYSTEM_SETTINGS, payrollCutoffDay: 31, defaultGeofenceRadiusMeters: 5 };
    const result = validateSystemSettings(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.payrollCutoffDay).toBeDefined();
    expect(result.errors.defaultGeofenceRadiusMeters).toBeDefined();
  });

  it("saves changes and appends an audit event", () => {
    const result = saveSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, reminderMinutes: 10 }, "employee-manager");
    expect(result.valid).toBe(true);
    expect(result.changedKeys).toEqual(["reminderMinutes"]);
    expect(getSettingsSnapshot().audits).toHaveLength(1);
    expect(getSettingsSnapshot().updatedBy).toBe("employee-manager");
  });

  it("applies saved values to the reminder policy", () => {
    const rental = RENTAL_FIXTURES.find((item) => item.id === "rental-near-end")!;
    expect(evaluateFiveMinuteReminder(rental, MOCK_SERVER_TIME.referenceIso).due).toBe(true);
    saveSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, reminderMinutes: 1 }, "employee-manager");
    expect(evaluateFiveMinuteReminder(rental, MOCK_SERVER_TIME.referenceIso).due).toBe(false);
  });

  it("restores the defaults without deleting the audit history", () => {
    saveSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, reminderMinutes: 10 }, "employee-manager");
    restoreDefaultSystemSettings("employee-owner");
    expect(getSettingsSnapshot().settings.reminderMinutes).toBe(5);
    expect(getSettingsSnapshot().audits).toHaveLength(2);
  });
});