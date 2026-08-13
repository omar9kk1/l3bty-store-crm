import type{AdvanceStatus,PayrollRunStatus}from"../types";
export const payrollStatusLabels:Record<PayrollRunStatus,string>={draft:"مسودة",calculating:"جارٍ الحساب",pending_review:"بانتظار المراجعة",approved:"معتمدة",partially_paid:"مدفوعة جزئيًا",paid:"مدفوعة",locked:"مقفلة",cancelled:"ملغاة"};
export const advanceStatusLabels:Record<AdvanceStatus,string>={draft:"مسودة",pending:"معلقة",approved:"معتمدة",rejected:"مرفوضة",paid_to_employee:"مدفوعة للموظف",active_repayment:"سداد نشط",completed:"مكتملة",cancelled:"ملغاة"};
export const payrollTone=(status:PayrollRunStatus)=>["paid","locked"].includes(status)?"success"as const:status==="approved"?"info"as const:status==="cancelled"?"danger"as const:"warning"as const;
export const formatMoney=(value:string)=>`${Number(value).toLocaleString("ar-EG-u-nu-latn",{minimumFractionDigits:2,maximumFractionDigits:2})} ج.م`;

