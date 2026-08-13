import { beforeEach, describe, expect, it } from "vitest";
import * as auditService from "../services/audit-service";
import { allowedPersonalAuditCategories, canViewAdministrativeAudit, canViewPersonalEvent } from "../permissions";

const input = { actorUserId: "user-manager", actorEmployeeId: "employee-manager", actorRolesSnapshot: ["manager"] as const, branchId: "main", action: "sensitive_change", category: "employees" as const, entityType: "employee", entityId: "employee-009", referenceNumber: "EMP-0009", severity: "critical" as const, reason: "اختبار التدقيق", before: { password: "top-secret", phone: "01012345678", count: 1 }, after: { apiKey: "key-value", cardNumber: "4111111111111111", count: 2 }, changedFields: ["count"], source: "web" as const, requestId: "req-test", idempotencyKey: "audit-test-idempotent", ipAddressMock: "192.0.2.50", userAgentSummaryMock: "Test Browser", createdAt: "2026-08-08T15:00:00.000Z" };

describe("append-only audit", () => {
  beforeEach(() => auditService.resetAuditStore());
  it("grants the comprehensive log only to owner and manager", () => {
    expect(canViewAdministrativeAudit(["owner"])).toBe(true);
    expect(canViewAdministrativeAudit(["manager"])).toBe(true);
    expect(canViewAdministrativeAudit(["sales_employee", "rental_maintenance_employee"])).toBe(false);
  });
  it("is append-only and idempotent with no edit or delete API", () => {
    const before = auditService.getAuditSnapshot().events.length;
    expect(auditService.appendAuditEvent(input).duplicate).toBe(false);
    expect(auditService.appendAuditEvent(input).duplicate).toBe(true);
    expect(auditService.getAuditSnapshot().events.length).toBe(before + 1);
    expect("deleteAuditEvent" in auditService).toBe(false);
    expect("updateAuditEvent" in auditService).toBe(false);
  });
  it("redacts secrets, cards, and partially masks phones", () => {
    const event = auditService.appendAuditEvent(input).event;
    expect(event.before?.password).toBe("[REDACTED]");
    expect(event.after?.apiKey).toBe("[REDACTED]");
    expect(event.after?.cardNumber).toBe("[REDACTED]");
    expect(event.before?.phone).not.toBe("01012345678");
    expect(event.after?.count).toBe(2);
  });
  it("keeps personal activity limited to the actor and role categories", () => {
    const events = auditService.getAuditSnapshot().events;
    const techFinance = events.find((event) => event.category === "finance")!;
    expect(canViewPersonalEvent(techFinance, "employee-technician", ["maintenance_technician"])).toBe(false);
    const salesRental = events.find((event) => event.category === "rental")!;
    expect(canViewPersonalEvent(salesRental, "employee-sales", ["sales_employee"])).toBe(false);
    const union = allowedPersonalAuditCategories(["sales_employee", "rental_maintenance_employee"]);
    expect(union.has("sales")).toBe(true);
    expect(union.has("rental")).toBe(true);
    expect(events.filter((event) => canViewPersonalEvent(event, "employee-technician", ["maintenance_technician"])).every((event) => !["finance", "payroll", "sales"].includes(event.category))).toBe(true);
  });
});
