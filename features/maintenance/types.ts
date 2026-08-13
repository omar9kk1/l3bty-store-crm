export type MaintenanceSubjectType = "internal_asset" | "customer_item";
export type MaintenancePriority = "low" | "normal" | "high" | "urgent";
export type FaultStatus = "draft" | "reported" | "notified" | "acknowledged" | "converted_to_order" | "cancelled" | "closed";
export type MaintenanceStatus =
  | "new" | "awaiting_acknowledgement" | "acknowledged" | "inspection_scheduled" | "diagnosing"
  | "awaiting_customer_approval" | "awaiting_part" | "transfer_requested" | "in_transit_to_workshop"
  | "received_at_workshop" | "in_repair" | "quality_check" | "ready_for_return"
  | "returning_to_branch" | "ready_for_delivery" | "delivered" | "closed" | "cancelled";
export type CustomerApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
export type PartUsageStatus = "requested" | "approved" | "issued" | "partially_issued" | "unavailable" | "returned" | "consumed";
export type WorkshopTransferStatus = "transfer_requested" | "approved" | "dispatched" | "in_transit" | "received" | "repair_in_progress" | "ready_to_return" | "returning_to_branch" | "returned_to_branch";

export interface MaintenanceAttachment { id:string;name:string;kind:"image"|"document";mockUrl:string; }
export interface MaintenanceEvent { id:string;type:string;at:string;by:string;branchId:string;previousValue:string;newValue:string;reason:string; }
export interface MaintenanceNotification { id:string;recipientEmployeeId:string|null;recipientRole:"manager"|"maintenance_technician"|"rental_maintenance_employee";branchId:string;title:string;message:string;href:string;createdAt:string;read:boolean; }

export interface FaultReport {
  id:string;faultNumber:string;branchId:string;locationId:string;reportedByEmployeeId:string;reportedAt:string;
  subjectType:MaintenanceSubjectType;rentalAssetId:string|null;customerId:string|null;customerItemId:string|null;
  itemName:string;itemDescription:string;faultDescription:string;intakeCondition:string;accessories:readonly string[];
  evidenceAttachments:readonly MaintenanceAttachment[];priority:MaintenancePriority;currentLocation:string;
  assignedTechnicianId:string|null;notifiedAt:string|null;acknowledgedAt:string|null;status:FaultStatus;
  stoppedOperating:boolean;expectedInspectionAt:string|null;notes:string;createdAt:string;updatedAt:string;
}

export interface PartUsage { id:string;maintenanceOrderId:string;productId:string;locationId:string;quantityRequested:number;quantityIssued:number;status:PartUsageStatus;issuedBy:string|null;issuedAt:string|null;note:string; }
export interface WorkshopTransfer { id:string;maintenanceOrderId:string;fromBranchId:string;toLocationId:"workshop";status:WorkshopTransferStatus;reason:string;conditionBeforeDispatch:string;accessories:readonly string[];dispatchedBy:string|null;receivedBy:string|null;dispatchedAt:string|null;receivedAt:string|null;returnedAt:string|null; }
export interface MaintenanceOrder {
  id:string;orderNumber:string;faultReportId:string;subjectType:MaintenanceSubjectType;branchId:string;customerId:string|null;
  rentalAssetId:string|null;customerItemId:string|null;assignedTechnicianId:string|null;status:MaintenanceStatus;
  diagnosis:string;faultCause:string;recommendedAction:string;labourEstimate:number;partsEstimate:number;estimatedTotal:number;
  approvedEstimate:number;finalLabourAmount:number;finalPartsAmount:number;finalTotal:number;customerApprovalStatus:CustomerApprovalStatus;
  technicianNotes:string;partUsages:readonly PartUsage[];workshopTransfer:WorkshopTransfer|null;labourWarrantyDays:number;
  partsWarrantyDays:number;startedAt:string|null;completedAt:string|null;readyAt:string|null;deliveredAt:string|null;
  expectedCompletionAt:string|null;currentLocation:string;events:readonly MaintenanceEvent[];createdAt:string;updatedAt:string;
}

export interface MaintenanceIntakeInput {
  subjectType:MaintenanceSubjectType;branchId:string;reportedByEmployeeId:string;rentalAssetId:string;customerId:string;
  itemName:string;itemDescription:string;brandModel:string;serialNumber:string;color:string;faultDescription:string;
  intakeCondition:string;accessories:readonly string[];priority:MaintenancePriority;stoppedOperating:boolean;
  expectedInspectionAt:string;notes:string;assignedTechnicianId:string|null;attachmentNames:readonly string[];idempotencyKey:string;
}

export interface DiagnosisInput { orderId:string;technicianId:string;diagnosis:string;faultCause:string;recommendedAction:string;labourEstimate:number;expectedCompletionAt:string;labourWarrantyDays:number;partsWarrantyDays:number;needsWorkshop:boolean;notes:string; }
