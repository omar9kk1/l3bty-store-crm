import { beforeEach, describe, expect, it } from "vitest";
import { buildPersonalReport } from "../services/personal-report-service";
import { buildReportPayload } from "../services/report-engine";
import { createReportSnapshot, getReportsSnapshot, openDelivery, resetReportsStore, retryDelivery, sendSnapshot } from "../services/report-store";
import { canSendReports, isReportsAdmin } from "../permissions";
import type { ReportQuery } from "../types";

const query = (overrides: Partial<ReportQuery> = {}): ReportQuery => ({
  reportKey: "management-summary",
  periodType: "daily",
  dateFrom: "2026-08-06",
  dateTo: "2026-08-06",
  branchIds: ["all"],
  employeeIds: [],
  activityTypes: [],
  statuses: [],
  comparisonEnabled: false,
  createdByEmployeeId: "employee-manager",
  generatedAt: "2026-08-06T22:00:00+03:00",
  ...overrides,
});

describe("reports and owner delivery", () => {
  beforeEach(() => resetReportsStore());

  it("keeps administration owner-manager only and sending manager-only", () => {
    expect(isReportsAdmin(["owner"])).toBe(true);
    expect(isReportsAdmin(["manager"])).toBe(true);
    expect(isReportsAdmin(["sales_employee"])).toBe(false);
    expect(isReportsAdmin(["rental_maintenance_employee", "maintenance_technician"])).toBe(false);
    expect(canSendReports(["manager"])).toBe(true);
    expect(canSendReports(["owner"])).toBe(false);
  });

  it("validates custom periods and builds all approved report definitions", () => {
    expect(buildReportPayload(query({ periodType: "custom", dateFrom: "", dateTo: "" })).valid).toBe(false);
    for (const reportKey of ["management-summary", "sales", "rentals", "maintenance", "inventory", "transfers", "finance", "shifts", "receivables", "expenses", "payroll", "attendance", "employees", "branches", "customers"]) {
      const result = buildReportPayload(query({ reportKey }));
      expect(result.valid, reportKey).toBe(true);
      if (result.valid) expect(result.payload.sections.length).toBeGreaterThan(0);
    }
  });

  it("creates an immutable deterministic snapshot and reuses its idempotency key", () => {
    const originalQuery = query();
    const first = createReportSnapshot(originalQuery, "snapshot-idempotent");
    expect(first.valid).toBe(true);
    if (!first.valid || !("snapshot" in first)) return;
    const frozenPayload = JSON.stringify(first.snapshot.payload);
    originalQuery.branchIds = ["main"];
    expect(JSON.stringify(first.snapshot.payload)).toBe(frozenPayload);
    expect(Object.isFrozen(first.snapshot)).toBe(true);
    expect(Object.isFrozen(first.snapshot.payload)).toBe(true);
    const duplicate = createReportSnapshot(query(), "snapshot-idempotent");
    expect(duplicate.valid && "duplicate" in duplicate && duplicate.duplicate).toBe(true);
    expect(getReportsSnapshot().snapshots.filter((item) => item.idempotencyKey === "snapshot-idempotent")).toHaveLength(1);
  });

  it("sends only a saved snapshot from manager to owner without duplication", () => {
    expect(sendSnapshot({ snapshotId: "missing", senderEmployeeId: "employee-manager", recipientOwnerEmployeeId: "employee-owner", note: "", idempotencyKey: "missing" }).valid).toBe(false);
    const created = createReportSnapshot(query(), "send-source");
    if (!created.valid || !("snapshot" in created)) throw new Error("snapshot not created");
    expect(sendSnapshot({ snapshotId: created.snapshot.id, senderEmployeeId: "employee-owner", recipientOwnerEmployeeId: "employee-owner", note: "", idempotencyKey: "wrong-role" }).valid).toBe(false);
    const sent = sendSnapshot({ snapshotId: created.snapshot.id, senderEmployeeId: "employee-manager", recipientOwnerEmployeeId: "employee-owner", note: "للمراجعة", idempotencyKey: "send-once" });
    expect(sent.valid).toBe(true);
    const duplicate = sendSnapshot({ snapshotId: created.snapshot.id, senderEmployeeId: "employee-manager", recipientOwnerEmployeeId: "employee-owner", note: "للمراجعة", idempotencyKey: "send-once" });
    expect(duplicate.valid && "duplicate" in duplicate && duplicate.duplicate).toBe(true);
    expect(getReportsSnapshot().notifications.some((item) => item.employeeId === "employee-owner" && item.href.includes(created.snapshot.id))).toBe(true);
  });

  it("records owner opening and retries a failed delivery with the same snapshot", () => {
    expect(openDelivery("delivery-unread", "employee-manager").valid).toBe(false);
    expect(openDelivery("delivery-unread", "employee-owner").valid).toBe(true);
    expect(getReportsSnapshot().deliveries.find((item) => item.id === "delivery-unread")?.status).toBe("opened");
    const originalSnapshotId = getReportsSnapshot().deliveries.find((item) => item.id === "delivery-failed")?.snapshotId;
    expect(retryDelivery("delivery-failed", "employee-owner").valid).toBe(false);
    expect(retryDelivery("delivery-failed", "employee-manager").valid).toBe(true);
    const retried = getReportsSnapshot().deliveries.find((item) => item.id === "delivery-failed");
    expect(retried?.status).toBe("sent");
    expect(retried?.snapshotId).toBe(originalSnapshotId);
    expect(retried?.retryCount).toBe(1);
  });

  it("limits personal reports to selected operational role unions", () => {
    const sales = buildPersonalReport(["sales_employee"], "employee-sales", ["main"]);
    expect(sales.sections.map((item) => item.id)).toEqual(["sales"]);
    const technician = buildPersonalReport(["maintenance_technician"], "employee-technician", ["workshop"]);
    expect(technician.sections.map((item) => item.id)).toEqual(["technical"]);
    expect(technician.metrics.some((item) => /راتب|خزينة|إيراد/.test(item.label))).toBe(false);
    const multiRole = buildPersonalReport(["sales_employee", "rental_maintenance_employee"], "employee-dual", ["main"]);
    expect(multiRole.sections.map((item) => item.id)).toEqual(["sales", "rentals"]);
  });
});
