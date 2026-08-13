export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationStatus = "unread" | "read" | "acted" | "dismissed" | "expired";
export type NotificationCategory = "rental" | "sales" | "maintenance" | "inventory" | "transfer" | "finance" | "shift" | "expense" | "payroll" | "attendance" | "report" | "customer" | "system";

export interface AppNotification {
  id: string;
  notificationNumber: string;
  recipientUserId: string;
  recipientEmployeeId: string;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  branchId: string;
  referenceType: string;
  referenceId: string;
  deepLink: string;
  status: NotificationStatus;
  readAt: string | null;
  actedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  idempotencyKey: string;
  metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface NotificationInput extends Omit<AppNotification, "id" | "notificationNumber" | "status" | "readAt" | "actedAt"> {
  status?: NotificationStatus;
  readAt?: string | null;
  actedAt?: string | null;
}

export interface NotificationsSnapshot { notifications: readonly AppNotification[] }
