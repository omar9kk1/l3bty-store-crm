import type{ExpenseApprovalStatus,ExpensePaidStatus,ExpenseStatus}from"../types";
export const expenseStatusLabels:Record<ExpenseStatus,string>={draft:"مسودة",submitted:"جديد",pending_approval:"بانتظار الموافقة",approved:"مسجل",rejected:"مرفوض",paid:"مدفوع",cancelled:"ملغي",reversed:"معكوس",needs_information:"معلومات مطلوبة"};
export const expenseApprovalLabels:Record<ExpenseApprovalStatus,string>={not_required:"غير مطلوبة",pending:"معلقة",approved:"معتمدة",rejected:"مرفوضة"};
export const expensePaidLabels:Record<ExpensePaidStatus,string>={unpaid:"غير مدفوع",paid:"مدفوع",reversed:"معكوس"};
export const expenseTone=(status:ExpenseStatus)=>status==="paid"?"success"as const:status==="approved"?"info"as const:["rejected","cancelled","reversed"].includes(status)?"danger"as const:"warning"as const;

