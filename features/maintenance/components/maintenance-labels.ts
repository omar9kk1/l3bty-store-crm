import type { MaintenancePriority, MaintenanceStatus, MaintenanceSubjectType } from "../types";

export const subjectLabels: Record<MaintenanceSubjectType, string> = {
  internal_asset: "أصل تأجير داخلي",
  customer_item: "لعبة كهربائية للعميل",
};

export const priorityLabels: Record<MaintenancePriority, string> = {
  low: "منخفضة", normal: "عادية", high: "مرتفعة", urgent: "عاجلة",
};

export const statusLabels: Record<MaintenanceStatus, string> = {
  new: "جديد", awaiting_acknowledgement: "بانتظار الاستلام", acknowledged: "تم الاستلام",
  inspection_scheduled: "فحص مجدول", diagnosing: "قيد التشخيص", awaiting_customer_approval: "بانتظار موافقة العميل",
  awaiting_part: "بانتظار قطعة", transfer_requested: "طلب تحويل", in_transit_to_workshop: "في الطريق للورشة",
  received_at_workshop: "مستلم بالورشة", in_repair: "قيد الإصلاح", quality_check: "فحص الجودة",
  ready_for_return: "جاهز للعودة", returning_to_branch: "عائد للفرع", ready_for_delivery: "جاهز للتسليم",
  delivered: "تم التسليم", closed: "مغلق", cancelled: "ملغي",
};

export const statusTone = (status: MaintenanceStatus) =>
  (["closed", "delivered"].includes(status) ? "success" : ["cancelled"].includes(status) ? "danger" : ["awaiting_customer_approval", "awaiting_part", "transfer_requested"].includes(status) ? "warning" : "info") as "success"|"danger"|"warning"|"info";

export const money = (value: number) => `${value.toLocaleString("ar-EG-u-nu-latn")} ج.م`;
export const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
