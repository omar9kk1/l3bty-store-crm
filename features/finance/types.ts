export type CashboxType="branch_cash"|"branch_card"|"branch_wallet"|"central_cash"|"clearing";
export type CashboxStatus="active"|"inactive"|"locked";
export type PaymentDirection="incoming"|"outgoing";
export type PaymentMethod="cash"|"card"|"electronic_wallet"|"bank_transfer"|"mixed";
export type PaymentStatus="pending"|"completed"|"partially_reversed"|"reversed"|"cancelled";
export type PaymentSourceType="sale"|"rental"|"maintenance"|"receivable"|"expense"|"payroll"|"advance"|"voucher"|"cashbox_transfer"|"administrative"|"refund";
export interface Cashbox{id:string;code:string;name:string;branchId:string;type:CashboxType;status:CashboxStatus;currentBalance:number;currency:"EGP";assignedEmployeeIds:readonly string[];allowNegativeBalance:boolean;createdAt:string;updatedAt:string}
export interface PaymentPart{id:string;method:Exclude<PaymentMethod,"mixed">;amount:number;reference:string}
export interface Payment{id:string;paymentNumber:string;branchId:string;cashboxId:string;shiftId:string|null;customerId:string|null;sourceType:PaymentSourceType;sourceId:string;direction:PaymentDirection;method:PaymentMethod;parts:readonly PaymentPart[];amount:number;currency:"EGP";reference:string;receivedByEmployeeId:string;status:PaymentStatus;paidAt:string;reversedPaymentId:string|null;idempotencyKey:string;administrativeReason:string;createdAt:string}
export type VoucherType="receipt"|"payment"|"transfer";
export interface Voucher{id:string;voucherNumber:string;type:VoucherType;branchId:string;cashboxId:string;destinationCashboxId:string|null;customerId:string|null;employeeId:string|null;amount:number;reason:string;referenceType:string;referenceId:string;status:"completed"|"reversed"|"cancelled";createdBy:string;approvedBy:string|null;createdAt:string;approvedAt:string|null;reversedAt:string|null;reversalReason:string;idempotencyKey:string}
export type ReceivableStatus="open"|"partially_paid"|"paid"|"overdue"|"cancelled";
export interface Receivable{id:string;customerId:string;branchId:string;sourceType:Exclude<PaymentSourceType,"voucher"|"cashbox_transfer"|"administrative"|"refund">;sourceId:string;originalAmount:number;paidAmount:number;remainingAmount:number;dueDate:string;status:ReceivableStatus;lastPaymentAt:string|null;createdAt:string;updatedAt:string}
export interface FinancialAuditEvent{id:string;type:string;entityType:"cashbox"|"payment"|"voucher"|"receivable"|"shift";entityId:string;actorEmployeeId:string;reason:string;createdAt:string}
export interface FinanceNotification{id:string;type:"shift_review"|"cash_difference"|"cashbox_locked"|"receivable_overdue"|"payment_reversed"|"long_open_shift";title:string;href:string;createdAt:string;read:boolean}
export interface FinanceSnapshot{cashboxes:readonly Cashbox[];payments:readonly Payment[];vouchers:readonly Voucher[];receivables:readonly Receivable[];audits:readonly FinancialAuditEvent[];notifications:readonly FinanceNotification[]}
export interface RecordPaymentInput{branchId:string;cashboxId:string;shiftId:string|null;customerId:string|null;sourceType:PaymentSourceType;sourceId:string;amount:number;parts:readonly Omit<PaymentPart,"id">[];employeeId:string;roles:readonly string[];assignedBranchIds:readonly string[];idempotencyKey:string;administrativeReason?:string;maximumAmount?:number}
