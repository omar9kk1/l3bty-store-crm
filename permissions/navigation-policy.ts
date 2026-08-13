import { PERMISSION_KEYS as permission } from "./keys";
import type { NavigationItem, PermissionKey } from "./types";

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { key: "dashboard", labelAr: "لوحة التحكم", descriptionAr: "نظرة عامة تناسب الدور والفرع الحاليين.", href: "/dashboard", icon: "dashboard", requiredPermission: permission.dashboard, section: "الرئيسية", exactMatch: true, mobilePriority: 5 },
  { key: "operations", labelAr: "مركز العمليات", descriptionAr: "مساحة موحدة لمتابعة سياق التشغيل الحالي.", href: "/operations", icon: "operations", requiredPermission: permission.operations, section: "التشغيل", exactMatch: true, mobilePriority: 1 },
  { key: "rentals", labelAr: "التأجير", descriptionAr: "إدارة التأجيرات الثابتة والمفتوحة.", href: "/rentals", icon: "rentals", requiredPermission: permission.rentals, section: "التشغيل", exactMatch: false, mobilePriority: 2 },
  { key: "sales", labelAr: "نقطة البيع", descriptionAr: "البيع والفواتير والمرتجعات ضمن نطاق الفرع.", href: "/sales/pos", icon: "sales", requiredPermission: permission.sales, section: "المبيعات", exactMatch: false, mobilePriority: 3 },
  { key: "maintenance", labelAr: "الصيانة", descriptionAr: "بلاغات الأعطال وأوامر الصيانة والتحويل للورشة.", href: "/maintenance", icon: "maintenance", requiredPermission: permission.maintenance, section: "الصيانة", exactMatch: false },
  { key: "customers", labelAr: "العملاء", descriptionAr: "إدارة ملفات العملاء حسب الدور والفرع.", href: "/customers", icon: "customers", requiredPermission: permission.customers, section: "التشغيل", exactMatch: false },
  { key: "products", labelAr: "منتجات البيع", descriptionAr: "ألعاب البيع وقطع الغيار فقط.", href: "/products", icon: "products", requiredPermission: permission.products, section: "المخزون", exactMatch: false },
  { key: "rental-assets", labelAr: "أصول التأجير", descriptionAr: "عرض وتشغيل الأصول المنفردة وحالتها.", href: "/rental-assets", icon: "assets", requiredPermission: permission.rentalAssets, section: "المخزون", exactMatch: false },
  { key: "inventory", labelAr: "المخزون", descriptionAr: "الأرصدة وحركات المخزون حسب الدور ونطاق الفروع.", href: "/inventory", icon: "inventory", requiredPermission: permission.inventory, section: "المخزون", exactMatch: true },
  { key: "transfers", labelAr: "التحويلات", descriptionAr: "طلبات التحويل والاستلام والتسليم بين الفروع والورشة.", href: "/inventory/transfers", icon: "transfers", requiredPermission: permission.transfersView, section: "المخزون", exactMatch: false },
  { key: "employees", labelAr: "الموظفون", descriptionAr: "إدارة الموظفين والأدوار والفروع المسندة.", href: "/employees", icon: "employees", requiredPermission: permission.employees, section: "الموظفون", exactMatch: false },
  { key: "attendance", labelAr: "الحضور والانصراف", descriptionAr: "تسجيل الحضور ومراجعة السجل حسب الصلاحية.", href: "/attendance", icon: "attendance", requiredPermission: permission.attendanceViewSelf, section: "الموظفون", exactMatch: false, mobilePriority: 4 },
  { key: "shifts", labelAr: "الورديات", descriptionAr: "فتح وإغلاق ومراجعة الورديات المالية حسب الصلاحية.", href: "/shifts", icon: "shifts", requiredPermission: permission.shifts, section: "الموظفون", exactMatch: false },
  { key: "finance", labelAr: "المالية", descriptionAr: "الخزائن والمدفوعات والسندات والمديونيات للإدارة.", href: "/finance", icon: "finance", requiredPermission: permission.finance, section: "المالية", exactMatch: false },
  { key: "expenses", labelAr: "المصروفات", descriptionAr: "إدارة طلبات المصروفات والموافقات والمدفوعات.", href: "/expenses", icon: "expenses", requiredPermission: permission.expenses, section: "المالية", exactMatch: false },
  { key: "payroll", labelAr: "الرواتب", descriptionAr: "إدارة دورات الرواتب والسلف والموافقات.", href: "/payroll", icon: "payroll", requiredPermission: permission.payroll, section: "المالية", exactMatch: false },
  { key: "reports", labelAr: "التقارير", descriptionAr: "مركز التقارير ونسخها الثابتة وتسليمها للمالك.", href: "/reports", icon: "reports", requiredPermission: permission.reports, section: "الإدارة", exactMatch: false },
  { key: "branches", labelAr: "الفروع والمواقع", descriptionAr: "إدارة الفروع والمواقع لمالك النشاط والمدير فقط.", href: "/branches", icon: "branches", requiredPermission: permission.branchesManage, section: "الإدارة", exactMatch: false },
  { key: "notifications", labelAr: "الإشعارات", descriptionAr: "مركز إشعارات المستخدم الحالي والروابط التشغيلية.", href: "/notifications", icon: "notifications", requiredPermission: permission.notifications, section: "الإدارة", exactMatch: true },
  { key: "activity-log", labelAr: "سجل النشاط", descriptionAr: "سجل النشاط الإداري الكامل لمالك النشاط والمدير.", href: "/activity-log", icon: "audit", requiredPermission: permission.audit, section: "الإدارة", exactMatch: true },
  { key: "settings", labelAr: "الإعدادات", descriptionAr: "إدارة النظام والأدوار والصلاحيات لمالك النشاط والمدير.", href: "/settings", icon: "settings", requiredPermission: permission.settings, section: "الإدارة", exactMatch: true },
];

export function filterNavigation(
  permissions: ReadonlySet<PermissionKey>,
): NavigationItem[] {
  return NAVIGATION_ITEMS.filter((item) => permissions.has(item.requiredPermission)).map((item) => {
    if (item.key === "attendance" && !permissions.has(permission.attendanceViewAll)) return { ...item, href: "/attendance/my" };
    if (item.key === "maintenance" && permissions.has(permission.maintenanceTechnician) && !permissions.has(permission.maintenanceIntake) && !permissions.has(permission.maintenanceManage)) return { ...item, href: "/maintenance/faults" };
    return item;
  });
}

export function isNavigationItemActive(item: NavigationItem, pathname: string) {
  if (item.key === "attendance") return pathname.startsWith("/attendance");
  if (item.key === "inventory") return pathname === "/inventory" || pathname.startsWith("/inventory/movements");
  if (item.key === "transfers") return pathname.startsWith("/inventory/transfers");
  return item.exactMatch ? pathname === item.href : pathname.startsWith(item.href);
}

export function findNavigationItem(pathname: string) {
  if (pathname.startsWith("/my-activity")) return { ...NAVIGATION_ITEMS.find((candidate) => candidate.key === "activity-log")!, labelAr: "نشاطي", href: "/my-activity", requiredPermission: permission.auditViewSelf };
  if (pathname.startsWith("/my-reports")) return { ...NAVIGATION_ITEMS.find((candidate) => candidate.key === "reports")!, labelAr: "تقارير نشاطي", href: "/my-reports", requiredPermission: permission.reportsViewSelf };
  if (pathname.startsWith("/reports/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "reports");
  if (pathname.startsWith("/my-expenses")) return { ...NAVIGATION_ITEMS.find((candidate) => candidate.key === "expenses")!, labelAr: "طلباتي المالية", href: "/my-expenses", requiredPermission: permission.expensesViewSelf };
  if (pathname.startsWith("/my-payroll")) return { ...NAVIGATION_ITEMS.find((candidate) => candidate.key === "payroll")!, labelAr: "كشف راتبي", href: "/my-payroll", requiredPermission: permission.payrollViewSelf };
  if (pathname.startsWith("/expenses/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "expenses");
  if (pathname.startsWith("/payroll/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "payroll");
  if (pathname.startsWith("/finance/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "finance");
  if (pathname.startsWith("/shifts/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "shifts");
  if (pathname.startsWith("/inventory/transfers")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "transfers");
  if (pathname.startsWith("/inventory/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "inventory");
  if (pathname.startsWith("/maintenance/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "maintenance");
  if (pathname.startsWith("/sales/")) return NAVIGATION_ITEMS.find((candidate) => candidate.key === "sales");
  if (pathname === "/attendance" || pathname.startsWith("/attendance/exceptions")) {
    const item = NAVIGATION_ITEMS.find((candidate) => candidate.key === "attendance")!;
    return { ...item, requiredPermission: permission.attendanceViewAll };
  }
  if (pathname.startsWith("/attendance/check")) {
    const item = NAVIGATION_ITEMS.find((candidate) => candidate.key === "attendance")!;
    return { ...item, requiredPermission: permission.attendanceCapture };
  }
  if (pathname.startsWith("/attendance/my")) {
    const item = NAVIGATION_ITEMS.find((candidate) => candidate.key === "attendance")!;
    return { ...item, requiredPermission: permission.attendanceViewSelf };
  }
  return NAVIGATION_ITEMS.find((item) => isNavigationItemActive(item, pathname));
}
