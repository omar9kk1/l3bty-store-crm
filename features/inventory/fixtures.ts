import type {InventoryAuditEvent} from "./types";
export const INVENTORY_AUDIT_FIXTURES:readonly InventoryAuditEvent[]=[
  {id:"inventory-audit-1",action:"opening_review",productId:"part-battery-12v",branchId:"main",oldValue:"9",newValue:"10",reason:"مراجعة رصيد افتتاحي Mock",performedByEmployeeId:"employee-manager",at:"2026-08-06T09:00:00+03:00"},
];
