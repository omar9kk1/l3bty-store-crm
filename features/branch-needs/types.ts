export type BranchNeedKind = "rental_game" | "sales_item";
export type BranchNeedPriority = "normal" | "urgent";
export type BranchNeedStatus = "pending" | "approved" | "rejected" | "fulfilled";

export interface BranchNeedRequest {
  id: string;
  requestNumber: string;
  kind: BranchNeedKind;
  branchId: string;
  requestedByEmployeeId: string;
  itemName: string;
  quantity: number;
  priority: BranchNeedPriority;
  reason: string;
  status: BranchNeedStatus;
  managementNote: string;
  reviewedByEmployeeId: string | null;
  transferId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchNeedInput {
  kind: BranchNeedKind;
  branchId: string;
  requestedByEmployeeId: string;
  itemName: string;
  quantity: number;
  priority: BranchNeedPriority;
  reason: string;
}
