export const ROLE_IDS = [
  "owner",
  "manager",
  "rental_maintenance_employee",
  "sales_employee",
  "maintenance_technician",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export type PermissionKey =
  | "dashboard.view"
  | "operations.view"
  | "rentals.view"
  | "sales.view"
  | "maintenance.view"
  | "maintenance.intake"
  | "maintenance.technician"
  | "maintenance.manage"
  | "customers.view"
  | "products.view"
  | "rental_assets.view"
  | "inventory.view"
  | "inventory.movements"
  | "inventory.cost"
  | "inventory.adjust"
  | "transfers.view"
  | "transfers.create"
  | "transfers.operate"
  | "transfers.approve"
  | "branch_needs.view"
  | "branch_needs.create"
  | "branch_needs.review"
  | "employees.view"
  | "profile.view"
  | "attendance.capture"
  | "attendance.view_self"
  | "attendance.view_all"
  | "attendance.correct"
  | "attendance.request_exception"
  | "attendance.review_exception"
  | "attendance.approve_exception"
  | "shifts.view"
  | "shifts.open"
  | "shifts.close"
  | "shifts.view_all"
  | "shifts.review"
  | "finance.view"
  | "finance.cashboxes"
  | "finance.payments"
  | "finance.vouchers"
  | "finance.receivables"
  | "finance.collect"
  | "finance.reverse"
  | "expenses.view"
  | "expenses.create"
  | "expenses.view_self"
  | "expenses.approve"
  | "expenses.pay"
  | "payroll.view"
  | "payroll.view_self"
  | "payroll.manage"
  | "payroll.approve"
  | "payroll.pay"
  | "advances.request"
  | "advances.manage"
  | "reports.view"
  | "reports.view_self"
  | "reports.snapshot"
  | "reports.deliver"
  | "branches.manage"
  | "notifications.view"
  | "audit.view"
  | "audit.view_self"
  | "settings.view";

export type NavigationSection =
  | "الرئيسية"
  | "التشغيل"
  | "المبيعات"
  | "الصيانة"
  | "ألعاب واحتياجات"
  | "المخزون"
  | "المالية"
  | "الموظفون"
  | "الإدارة";

export type NavigationIcon =
  | "dashboard"
  | "operations"
  | "rentals"
  | "sales"
  | "maintenance"
  | "customers"
  | "products"
  | "assets"
  | "inventory"
  | "transfers"
  | "clipboard"
  | "employees"
  | "attendance"
  | "shifts"
  | "finance"
  | "expenses"
  | "payroll"
  | "reports"
  | "branches"
  | "notifications"
  | "audit"
  | "settings";

export interface NavigationItem {
  key: string;
  labelAr: string;
  descriptionAr: string;
  href: string;
  icon: NavigationIcon;
  requiredPermission: PermissionKey;
  section: NavigationSection;
  mobilePriority?: number;
  exactMatch?: boolean;
}

export interface RoleTemplate {
  id: RoleId;
  labelAr: string;
  shortLabelAr: string;
  permissions: readonly PermissionKey[];
  branchIds: "all" | readonly string[];
}
