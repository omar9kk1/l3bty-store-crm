import type { MaintenanceSubjectType } from "../types";

export function maintenanceIntakeHref(type: MaintenanceSubjectType, receiptOrderId?: string) {
  const params = new URLSearchParams({ type });
  if (receiptOrderId) params.set("receipt", receiptOrderId);
  return `/maintenance/intake?${params.toString()}`;
}
