import type { RoleId } from "@/permissions/types";

export type AuditSeverity = "info" | "notice" | "important" | "critical";
export type AuditSource = "web" | "mobile_web" | "system_mock";
export type AuditCategory = "employees" | "attendance" | "rental" | "sales" | "maintenance" | "inventory" | "transfer" | "finance" | "shift" | "expense" | "payroll" | "report" | "customer" | "system";
export type AuditValue = Readonly<Record<string, unknown>> | null;

export interface AuditEvent {
  id: string;
  eventNumber: string;
  actorUserId: string;
  actorEmployeeId: string;
  actorRolesSnapshot: readonly RoleId[];
  branchId: string;
  action: string;
  category: AuditCategory;
  entityType: string;
  entityId: string;
  referenceNumber: string;
  severity: AuditSeverity;
  reason: string;
  before: AuditValue;
  after: AuditValue;
  changedFields: readonly string[];
  source: AuditSource;
  requestId: string;
  idempotencyKey: string;
  ipAddressMock: string;
  userAgentSummaryMock: string;
  createdAt: string;
}

export interface AuditEventInput extends Omit<AuditEvent, "id" | "eventNumber" | "before" | "after"> { before: AuditValue; after: AuditValue }
export interface AuditSnapshot { events: readonly AuditEvent[] }
