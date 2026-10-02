import type { MoneyString } from "@/lib/utils/money";

export type ExpenseStatus = "draft" | "submitted" | "pending_approval" | "approved" | "rejected" | "paid" | "cancelled" | "reversed" | "needs_information";
export type ExpenseApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
export type ExpensePaidStatus = "unpaid" | "paid" | "reversed";
export type ExpenseViewState = "normal" | "loading" | "empty" | "error" | "offline";
export interface ExpenseCategory { id:string; name:string; active:boolean; requiresApproval:boolean; approvalLimit:MoneyString; allowedRoles:readonly string[]; branchScoped:boolean; requiresAttachment?:boolean }
export interface ExpenseAttachment { id:string; name:string; mockReference:string }
export interface Expense { id:string; expenseNumber:string; branchId:string; categoryId:string; categoryName:string; requestedByEmployeeId:string; approvedByEmployeeId:string|null; cashboxId:string|null; amount:MoneyString; currency:"EGP"; expenseDate:string; description:string; businessPurpose:string; attachments:readonly ExpenseAttachment[]; status:ExpenseStatus; approvalStatus:ExpenseApprovalStatus; paidStatus:ExpensePaidStatus; paymentId:string|null; rejectionReason:string; cancellationReason:string; paidPersonally:boolean; reimbursementRequested:boolean; createdAt:string; updatedAt:string; approvedAt:string|null; paidAt:string|null }
export interface ExpenseAudit { id:string; expenseId:string; action:string; actorEmployeeId:string; reason:string; previousValue:string; newValue:string; at:string }
export interface ExpenseNotification { id:string; employeeId:string|null; title:string; href:string; at:string }
export interface ExpenseSnapshot { expenses:readonly Expense[]; categories:readonly ExpenseCategory[]; audits:readonly ExpenseAudit[]; notifications:readonly ExpenseNotification[] }
export interface ExpenseRequestInput { branchId:string; categoryId:string; categoryName?:string; amount:string; expenseDate:string; description:string; businessPurpose:string; attachmentName?:string; paidPersonally:boolean; reimbursementRequested:boolean; requestedByEmployeeId:string; assignedBranchIds:readonly string[]; idempotencyKey:string }

