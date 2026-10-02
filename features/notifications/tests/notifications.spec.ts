import { beforeEach, describe, expect, it } from "vitest";
import { canOpenNotificationReference, canReceiveNotification, resolveNotificationIdentity } from "../permissions";
import { dismissNotification, getNotificationsSnapshot, markAllNotificationsRead, markNotificationRead, markNotificationUnread, publishNotification, resetNotificationStore } from "../services/notification-service";
import { createReportSnapshot, resetReportsStore, sendSnapshot } from "@/features/reports/services/report-store";
import { notificationBranchLabel } from "../components/notification-ui";

describe("central notifications", () => {
  beforeEach(() => { resetNotificationStore(); resetReportsStore(); });

  it("isolates every user even when a foreign userId is supplied elsewhere", () => {
    const sales = resolveNotificationIdentity(["sales_employee"]);
    const visible = getNotificationsSnapshot().notifications.filter((item) => canReceiveNotification(item, ["sales_employee"]));
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((item) => item.recipientUserId === sales.userId)).toBe(true);
    expect(visible.some((item) => item.recipientUserId === "user-owner")).toBe(false);
  });

  it("marks one or all notifications only for the current recipient", () => {
    const ownerItem = getNotificationsSnapshot().notifications.find((item) => item.recipientUserId === "user-owner" && item.status === "unread")!;
    const managerUnreadBefore = getNotificationsSnapshot().notifications.filter((item) => item.recipientUserId === "user-manager" && item.status === "unread").length;
    expect(markNotificationRead(ownerItem.id, "user-manager")).toBe(false);
    expect(markNotificationRead(ownerItem.id, "user-owner")).toBe(true);
    expect(markNotificationUnread(ownerItem.id, "user-owner")).toBe(true);
    markAllNotificationsRead("user-owner");
    expect(getNotificationsSnapshot().notifications.filter((item) => item.recipientUserId === "user-owner" && item.status === "unread")).toHaveLength(0);
    expect(getNotificationsSnapshot().notifications.filter((item) => item.recipientUserId === "user-manager" && item.status === "unread")).toHaveLength(managerUnreadBefore);
    expect(dismissNotification(ownerItem.id, "user-owner")).toBe(true);
  });

  it("uses idempotency for rental reminders and technician assignments", () => {
    const base = { recipientUserId: "user-rental", recipientEmployeeId: "employee-rental", type: "five_minute", category: "rental" as const, priority: "urgent" as const, title: "متبقي 5 دقائق", body: "تذكير", branchId: "main", referenceType: "rental", referenceId: "rental-near-end", deepLink: "/rentals/rental-near-end", createdAt: "2026-08-08T15:00:00.000Z", expiresAt: null, metadata: {} };
    expect(publishNotification({ ...base, idempotencyKey: "rental:new:five-minute-reminder" }).duplicate).toBe(false);
    expect(publishNotification({ ...base, idempotencyKey: "rental:new:five-minute-reminder" }).duplicate).toBe(true);
    const fault = { ...base, recipientUserId: "user-technician", recipientEmployeeId: "employee-technician", type: "assigned", category: "maintenance" as const, deepLink: "/maintenance/faults/fault-2", referenceType: "fault_report", referenceId: "fault-2", idempotencyKey: "fault:fault-2:assigned:employee-technician" };
    expect(publishNotification(fault).duplicate).toBe(true);
  });

  it("does not turn a notification into entity permission", () => {
    const report = getNotificationsSnapshot().notifications.find((item) => item.category === "report")!;
    expect(canOpenNotificationReference(report, ["owner"])).toBe(true);
    expect(canOpenNotificationReference(report, ["maintenance_technician"])).toBe(false);
    const technician = getNotificationsSnapshot().notifications.find((item) => item.id === "notification-tech-assigned")!;
    expect(canReceiveNotification(technician, ["maintenance_technician"])).toBe(true);
    expect(canReceiveNotification(technician, ["sales_employee"])).toBe(false);
  });

  it("routes a sent report to the owner only", () => {
    const query = { reportKey: "management-summary", periodType: "daily" as const, dateFrom: "2026-08-08", dateTo: "2026-08-08", branchIds: ["all"], employeeIds: [], activityTypes: [], statuses: [], comparisonEnabled: false, createdByEmployeeId: "employee-manager", generatedAt: "2026-08-08T15:00:00.000Z" };
    const created = createReportSnapshot(query, "notification-report-source");
    if (!created.valid || !("snapshot" in created)) throw new Error("snapshot not created");
    expect(sendSnapshot({ snapshotId: created.snapshot.id, senderEmployeeId: "employee-manager", recipientOwnerEmployeeId: "employee-owner", note: "للمالك", idempotencyKey: "notification-report-send" }).valid).toBe(true);
    const linked = getNotificationsSnapshot().notifications.find((item) => item.referenceId === created.snapshot.id);
    expect(linked?.recipientUserId).toBe("user-owner");
    expect(linked?.recipientEmployeeId).toBe("employee-owner");
  });

  it("shows readable Arabic names instead of internal notification scopes", () => {
    const branches = [
      { id: "branch-01", name: "مول غازي", type: "branch" as const },
      { id: "branch-02", name: "الورشة المركزية 1", type: "central_workshop" as const },
    ];

    expect(notificationBranchLabel("branch-01", branches)).toBe("مول غازي");
    expect(notificationBranchLabel("workshop", branches)).toBe("الورشة المركزية 1");
    expect(notificationBranchLabel("all", branches)).toBe("كل الفروع");
    expect(notificationBranchLabel("missing-branch", branches)).toBe("فرع غير معروف");
  });
});
