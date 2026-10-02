export const LOCAL_DATA_DOMAINS = {
  branches: "l3bty-local-branches-v1",
  customers: "l3bty-local-customers-v1",
  employees: "l3bty-local-employees-v1",
  finance: "l3bty-local-finance-v1",
  shifts: "l3bty-local-shifts-v1",
  rentals: "l3bty-rental-store-v1",
  products: "l3bty-local-products-v1",
  sales: "l3bty-local-sales-v1",
  maintenance: "l3bty-local-maintenance-v1",
  inventory: "l3bty-local-inventory-v1",
  transfers: "l3bty-local-transfers-v1",
  branchNeeds: "l3bty-local-branch-needs-v1",
  attendance: "l3bty-local-attendance-v1",
  expenses: "l3bty-local-expenses-v1",
  payroll: "l3bty-local-payroll-v1",
  notifications: "l3bty-local-notifications-v1",
  audit: "l3bty-local-audit-v1",
  reports: "l3bty-local-reports-v1",
} as const;

export type LocalDataKey = typeof LOCAL_DATA_DOMAINS[keyof typeof LOCAL_DATA_DOMAINS];
export const LOCAL_DATA_KEYS = Object.values(LOCAL_DATA_DOMAINS) as LocalDataKey[];

export interface LocalDatabaseSnapshot {
  key: LocalDataKey;
  version: number;
  data: unknown;
  updatedAt: string;
}

export function isLocalDataKey(value: unknown): value is LocalDataKey {
  return typeof value === "string" && LOCAL_DATA_KEYS.includes(value as LocalDataKey);
}
