import type { SaleProductType } from "@/features/products/types";
import type { RoleId } from "@/permissions/types";

export type SaleInvoiceStatus = "draft" | "completed" | "partially_returned" | "fully_returned" | "cancelled";
export type SalePaymentMethod = "cash" | "card" | "wallet" | "mixed";
export type SaleReturnKind = "full" | "partial" | "exchange";
export type ReturnedItemCondition = "resellable" | "needs_inspection" | "damaged";

export interface CartLine { productId:string;name:string;type:SaleProductType;quantity:number;unitPrice:number;originalUnitPrice:number;discount:number;tax:number;lineTotal:number;availableStock:number;priceOverrideReason:string; }
export interface SaleInvoiceLine { id:string;productId:string;name:string;type:SaleProductType;quantity:number;returnedQuantity:number;unitPrice:number;discountPercent:number;taxRate:number;lineTotal:number;costSnapshot:number; }
export interface SalePayment { id:string;method:Exclude<SalePaymentMethod,"mixed">;amount:number;reference:string;receivedBy:string;shiftId:string; }
export interface SaleAuditEvent { id:string;type:"created"|"price_override"|"discount_override"|"completed"|"cancelled"|"return"|"exchange"|"whatsapp_opened";at:string;by:string;note:string; }
export interface SaleInvoice { id:string;invoiceNumber:string;customerId:string;branchId:string;employeeId:string;shiftId:string;createdAt:string;status:SaleInvoiceStatus;lines:readonly SaleInvoiceLine[];subtotal:number;lineDiscountTotal:number;invoiceDiscountPercent:number;invoiceDiscountAmount:number;taxTotal:number;totalAmount:number;paidAmount:number;remainingAmount:number;payments:readonly SalePayment[];approvalReason:string;idempotencyKey:string;events:readonly SaleAuditEvent[]; }
export interface SaleReturnLine { invoiceLineId:string;productId:string;quantity:number;condition:ReturnedItemCondition;amount:number; }
export interface SaleReturnRecord { id:string;returnNumber:string;invoiceId:string;kind:SaleReturnKind;branchId:string;employeeId:string;createdAt:string;reason:string;refundMethod:"cash"|"original_method"|"customer_credit";refundAmount:number;replacementProductId:string|null;lines:readonly SaleReturnLine[];approvalReason:string; }
export interface SaleCheckoutInput { customerId:string;branchId:string;employeeId:string;roles:readonly RoleId[];payments:readonly Omit<SalePayment,"id"|"receivedBy"|"shiftId">[];invoiceDiscountPercent:number;approvalReason:string;managerApproved:boolean;allowDebt:boolean;idempotencyKey:string; }
export interface SaleReturnInput { invoiceId:string;invoiceLineId:string;quantity:number;condition:ReturnedItemCondition;kind:SaleReturnKind;reason:string;refundMethod:SaleReturnRecord["refundMethod"];replacementProductId:string;employeeId:string;approvalReason:string; }
