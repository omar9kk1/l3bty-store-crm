const fieldLabels: Record<string, string> = {
  product: "المنتج",
  productId: "المنتج",
  branch: "الفرع",
  branchId: "الفرع",
  available: "المتاح",
  averageCost: "متوسط التكلفة",
  number: "الرقم",
  employee: "الموظف",
  total: "الإجمالي",
  status: "الحالة",
  amount: "المبلغ",
  technician: "الفني",
  from: "من",
  to: "إلى",
  source: "المصدر",
  method: "طريقة الدفع",
  original: "القيمة الأصلية",
  paid: "المدفوع",
  remaining: "المتبقي",
  category: "النوع",
  period: "الفترة",
  employees: "عدد الموظفين",
  net: "الصافي",
  date: "التاريخ",
  lateMinutes: "دقائق التأخير",
  name: "الاسم",
  phone: "الهاتف",
  roles: "الأدوار",
  code: "الكود",
  sales: "المبيعات",
  rentals: "التأجيرات",
  maintenance: "الصيانة",
  collections: "التحصيلات",
};

const valueLabels: Record<string, string> = {
  workshop: "الورشة المركزية",
  active: "نشط",
  inactive: "غير نشط",
  open: "مفتوح",
  closed: "مغلق",
  pending: "قيد الانتظار",
  pending_review: "بانتظار المراجعة",
  closing_review: "بانتظار مراجعة الإغلاق",
  completed: "مكتمل",
  cancelled: "ملغي",
  paid: "مدفوع",
  partially_paid: "مدفوع جزئيًا",
  overdue: "متأخر",
  reversed: "معكوس",
  in_repair: "قيد الإصلاح",
  ready_for_delivery: "جاهز للتسليم",
  present: "حاضر",
  late: "متأخر",
  absent: "غائب",
  cash: "نقدي",
};

export interface ReportDisplayLookups {
  branches?: ReadonlyMap<string, string>;
  products?: ReadonlyMap<string, string>;
  employees?: ReadonlyMap<string, string>;
}

const branchFields = new Set(["branch", "branchId", "source", "from", "to", "location"]);
const employeeFields = new Set(["employee", "technician"]);
const productFields = new Set(["product", "productId"]);

export function formatReportFieldLabel(key: string) {
  return fieldLabels[key] ?? key;
}

export function formatReportDisplayValue(
  key: string,
  value: string | number | undefined,
  lookups: ReportDisplayLookups = {},
) {
  if (typeof value !== "string") return value;

  if (productFields.has(key)) {
    return lookups.products?.get(value) ?? (value.startsWith("product-") ? "منتج غير معروف" : value);
  }

  if (branchFields.has(key)) {
    return lookups.branches?.get(value) ?? valueLabels[value] ?? (value.startsWith("branch-") ? "فرع غير معروف" : value);
  }

  if (employeeFields.has(key)) {
    return lookups.employees?.get(value) ?? (value.startsWith("employee-") ? "موظف غير معروف" : value);
  }

  return valueLabels[value] ?? value;
}
