export type InventoryMovementType="opening_balance"|"purchase_receipt"|"sale"|"sale_return"|"maintenance_issue"|"maintenance_return"|"transfer_dispatch"|"transfer_receive"|"adjustment_in"|"adjustment_out"|"stock_count_difference"|"damaged"|"written_off";
export interface StockBalance{id:string;productId:string;branchId:string;quantityOnHand:number;quantityReserved:number;quantityAvailable:number;minimumStock:number;reorderLevel:number;averageCost:string;lastMovementAt:string;updatedAt:string}
export interface StockMovement{id:string;movementNumber:string;productId:string;branchId:string;type:InventoryMovementType;quantity:number;quantityBefore:number;quantityAfter:number;unitCost:string;referenceType:string;referenceId:string;performedByEmployeeId:string;reason:string;occurredAt:string;idempotencyKey:string}
export interface InventoryAuditEvent{id:string;action:string;productId:string;branchId:string;oldValue:string;newValue:string;reason:string;performedByEmployeeId:string;at:string}
export interface StockAdjustmentInput{productId:string;branchId:string;actualQuantity:number;reason:string;notes:string;performedByEmployeeId:string;idempotencyKey:string}


export type SparePartIntakeSource="technician_purchase"|"technician_brought"|"supplier_delivery"|"other";
export type SparePartRestockPriority="normal"|"high"|"urgent";
export type SparePartRestockStatus="requested"|"approved"|"ordered"|"received"|"rejected";
export interface SparePartIntakeRecord{id:string;intakeNumber:string;productId:string;branchId:string;quantity:number;source:SparePartIntakeSource;reference:string;notes:string;receivedByEmployeeId:string;receivedAt:string;idempotencyKey:string}
export interface SparePartIntakeInput{productId?:string;partName?:string;branchId:string;quantity:number;source:SparePartIntakeSource;reference:string;notes:string;receivedByEmployeeId:string;idempotencyKey:string}
export interface SparePartRestockRequest{id:string;requestNumber:string;productId:string|null;partName:string;branchId:string;requestedQuantity:number;priority:SparePartRestockPriority;reason:string;requestedByEmployeeId:string;status:SparePartRestockStatus;reviewedByEmployeeId:string|null;reviewNote:string;requestedAt:string;reviewedAt:string|null;idempotencyKey:string}
export interface SparePartRestockInput{productId?:string;partName?:string;branchId:string;requestedQuantity:number;priority:SparePartRestockPriority;reason:string;requestedByEmployeeId:string;idempotencyKey:string}
