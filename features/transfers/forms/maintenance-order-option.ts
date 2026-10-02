import { statusLabels } from "@/features/maintenance/components/maintenance-labels";
import type { MaintenanceOrder } from "@/features/maintenance/types";

export function formatMaintenanceOrderOption(
  order: Pick<MaintenanceOrder, "orderNumber" | "status">,
  itemName?: string,
) {
  const parts = [order.orderNumber, itemName?.trim(), statusLabels[order.status]];

  return parts.filter(Boolean).join(" — ");
}

export function formatTransferRoute(
  sourceId: string,
  destinationId: string,
  resolveLocationName: (locationId: string) => string,
) {
  return `من ${resolveLocationName(sourceId)} إلى ${resolveLocationName(destinationId)}`;
}
