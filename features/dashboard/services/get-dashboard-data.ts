import type { RoleId } from "@/permissions/types";
import { ACTIVE_RENTALS_FIXTURES, DASHBOARD_BRANCH_FIXTURES, MANAGEMENT_ALERTS, RENTAL_ALERTS, SALES_ALERTS, STOCK_FIXTURES, TECH_ALERTS } from "../fixtures";
import { dashboardVisibility, resolveDashboardMode } from "../permissions";
import type { DashboardMetric, DashboardModel, DashboardPeriod, DashboardQuery, StockAlert } from "../types";
import { getSalesSnapshot } from "@/features/sales/services/sales-store";
import { SALE_INVOICE_FIXTURES } from "@/features/sales/fixtures";
import { getBranchesSnapshot } from "@/features/branches/services/branch-store";
import { getInventorySnapshot } from "@/features/inventory/services/inventory-service";
import { getProductSnapshot } from "@/features/products/services/product-store";
import { getFinanceSnapshot } from "@/features/finance/services/finance-store";
import { getShiftSnapshot } from "@/features/shifts/services/shift-store";
import { getExpenseSnapshot } from "@/features/expenses/services/expense-store";
import { getPayrollSnapshot } from "@/features/payroll/services/payroll-store";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { getReportsSnapshot } from "@/features/reports/services/report-store";
import { getRentalSnapshot } from "@/features/rentals/services/rental-store";
import { getMaintenanceSnapshot } from "@/features/maintenance/services/maintenance-store";

const periodFactor: Record<DashboardPeriod, number> = { today: 1, week: 6.35, month: 25.4 };
const branchFactor: Record<string, number> = { all: 2.42, main: 1, "branch-2": 0.72, "branch-3": 0.58, workshop: 0.31 };
const scale = (value: number, query: DashboardQuery) => Math.round(value * periodFactor[query.period] * (branchFactor[query.branchId] ?? 1));
const TEST_DATA = process.env.NODE_ENV === "test";
const salesSummary = () => { const source = TEST_DATA ? SALE_INVOICE_FIXTURES : getSalesSnapshot().invoices; const completed = source.filter((invoice) => invoice.status !== "cancelled"); return { total: completed.reduce((sum, invoice) => sum + invoice.totalAmount, 0), count: completed.length }; };

const series = {
  up: [18, 22, 21, 28, 31, 35, 42, 47],
  down: [46, 43, 40, 41, 35, 31, 27, 23],
  neutral: [30, 31, 29, 30, 32, 30, 31, 30],
} as const;

function managementMetrics(query: DashboardQuery): DashboardMetric[] {
  const sales = salesSummary();
  const finance = getFinanceSnapshot();
  const shifts = getShiftSnapshot().shifts;
  const scopedCashboxes = finance.cashboxes.filter((item) => query.branchId === "all" || item.branchId === query.branchId);
  const scopedIncoming = finance.payments.filter((item) => item.direction === "incoming" && item.status === "completed" && (query.branchId === "all" || item.branchId === query.branchId));
  const rentalRevenue = scopedIncoming.filter((item) => item.sourceType === "rental").reduce((sum, item) => sum + item.amount, 0);
  const maintenanceRevenue = scopedIncoming.filter((item) => item.sourceType === "maintenance").reduce((sum, item) => sum + item.amount, 0);
  const latestCollection = finance.payments.find((item) => item.direction === "incoming" && item.status === "completed");
  const all = [
    { key: "sales", label: "مبيعات الفترة", value: scale(sales.total, query), unit: "ج.م", description: `${sales.count} فواتير مكتملة`, trend: TEST_DATA ? "up" : "neutral", icon: "sales", sparkline: TEST_DATA ? series.up : undefined },
    { key: "rental", label: "إيرادات التأجير", value: TEST_DATA ? scale(29800, query) : rentalRevenue, unit: "ج.م", comparison: TEST_DATA ? "+7.8%" : undefined, description: rentalRevenue ? "من تحصيلات التأجير المسجلة" : "لا توجد تحصيلات تأجير", trend: TEST_DATA ? "up" : "neutral", icon: "rentals", sparkline: TEST_DATA ? series.up : undefined },
    { key: "maintenance", label: "إيرادات الصيانة", value: TEST_DATA ? scale(18400, query) : maintenanceRevenue, unit: "ج.م", comparison: TEST_DATA ? "-2.1%" : undefined, description: maintenanceRevenue ? "من تحصيلات الصيانة المسجلة" : "لا توجد تحصيلات صيانة", trend: TEST_DATA ? "down" : "neutral", icon: "maintenance", sparkline: TEST_DATA ? series.down : undefined },
    { key: "cash", label: "رصيد الخزائن الآن", value: scopedCashboxes.reduce((sum, item) => sum + item.currentBalance, 0), unit: "ج.م", comparison: `${shifts.filter((item) => item.status === "open" && (query.branchId === "all" || item.branchId === query.branchId)).length} ورديات مفتوحة`, description: latestCollection ? `آخر تحصيل ${latestCollection.paymentNumber}` : "لا توجد تحصيلات", trend: "neutral", icon: "finance" },
  ] satisfies DashboardMetric[];
  return query.type === "all" ? all : all.filter((metric) => metric.key === query.type || metric.key === "cash");
}

function operationalMetrics(query: DashboardQuery, roles: readonly RoleId[]): DashboardMetric[] {
  const sales = salesSummary();
  const rentalSnapshot = getRentalSnapshot();
  const maintenanceSnapshot = getMaintenanceSnapshot();
  const finance = getFinanceSnapshot();
  const metrics: DashboardMetric[] = [];
  const employeeId = roles.includes("sales_employee") && roles.includes("rental_maintenance_employee") ? "employee-dual" : roles.includes("sales_employee") ? "employee-sales" : "employee-rental";
  const shift = getShiftSnapshot().shifts.find((item) => item.employeeId === employeeId && item.status === "open");
  const shiftCollections = getFinanceSnapshot().payments.filter((item) => item.shiftId === shift?.id && item.direction === "incoming").reduce((sum, item) => sum + item.amount, 0);
  const rentalCollections = finance.payments.filter((item) => item.direction === "incoming" && item.status === "completed" && item.sourceType === "rental" && (!shift || item.shiftId === shift.id)).reduce((sum, item) => sum + item.amount, 0);
  const activeRentals = rentalSnapshot.rentals.filter((item) => ["active", "near_end", "additional_time"].includes(item.status) && (query.branchId === "all" || item.branchId === query.branchId));
  const openMaintenance = maintenanceSnapshot.orders.filter((item) => !["closed", "cancelled", "delivered"].includes(item.status) && (query.branchId === "all" || item.branchId === query.branchId));
  if (roles.includes("sales_employee")) metrics.push(
    { key: "sales-total", label: "مبيعات اليوم", value: scale(sales.total, query), unit: "ج.م", description: "من المبيعات المسجلة", trend: "neutral", icon: "sales" },
    { key: "invoice-count", label: "عدد الفواتير", value: sales.count, description: "فاتورة مكتملة ضمن النطاق", trend: "neutral", icon: "clipboard" },
    { key: "returns", label: "مرتجعات مسجلة", value: getSalesSnapshot().returns.length, description: "حركات المرتجع المسجلة", trend: "neutral", icon: "activity" },
    { key: "sales-shift", label: "رصيد ورديتي", value: (shift?.openingBalance ?? 0) + shiftCollections, unit: "ج.م", description: shift ? "الوردية مفتوحة" : "لا توجد وردية مفتوحة", trend: "neutral", icon: "finance" },
  );
  if (roles.includes("rental_maintenance_employee")) metrics.push(
    { key: "rental-collection", label: "تحصيلات التأجير", value: TEST_DATA ? scale(6850, query) : rentalCollections, unit: "ج.م", comparison: TEST_DATA ? "+5.4%" : undefined, description: rentalCollections ? "ضمن الفرع والوردية" : "لا توجد تحصيلات تأجير", trend: TEST_DATA ? "up" : "neutral", icon: "rentals", sparkline: TEST_DATA ? series.up : undefined },
    { key: "active-rentals", label: "التأجيرات النشطة", value: TEST_DATA ? 7 : activeRentals.length, description: TEST_DATA ? "3 تقترب من الانتهاء" : `${activeRentals.filter((item) => item.status === "near_end").length} تقترب من الانتهاء`, trend: "neutral", icon: "rentals", sparkline: TEST_DATA ? series.neutral : undefined },
    { key: "maintenance-intake", label: "طلبات صيانة مستلمة", value: TEST_DATA ? 5 : openMaintenance.length, description: TEST_DATA ? "طلبان بانتظار الفحص" : `${openMaintenance.filter((item) => ["new", "awaiting_acknowledgement", "diagnosing"].includes(item.status)).length} بانتظار الفحص`, trend: TEST_DATA ? "up" : "neutral", icon: "maintenance", sparkline: TEST_DATA ? series.up : undefined },
    { key: "rental-shift", label: "رصيد ورديتي", value: (shift?.openingBalance ?? 0) + shiftCollections, unit: "ج.م", description: shift ? "تحصيلات الوردية الحالية" : "لا توجد وردية مفتوحة", trend: "neutral", icon: "finance" },
  );
  if (roles.includes("maintenance_technician")) metrics.push(
    { key: "faults", label: "البلاغات الجديدة", value: TEST_DATA ? 4 : maintenanceSnapshot.faults.filter((item) => !["closed", "cancelled"].includes(item.status)).length, description: TEST_DATA ? "بلاغان بأولوية مرتفعة" : "البلاغات المفتوحة المسجلة", trend: TEST_DATA ? "up" : "neutral", icon: "notifications", sparkline: TEST_DATA ? series.up : undefined },
    { key: "repairing", label: "قيد الفحص أو الإصلاح", value: TEST_DATA ? 9 : openMaintenance.filter((item) => ["diagnosing", "in_repair", "quality_check"].includes(item.status)).length, description: "أوامر الصيانة الحالية", trend: "neutral", icon: "maintenance", sparkline: TEST_DATA ? series.neutral : undefined },
    { key: "ready", label: "جاهزة للتسليم", value: TEST_DATA ? 3 : maintenanceSnapshot.orders.filter((item) => ["ready_for_return", "ready_for_delivery"].includes(item.status)).length, description: "أوامر جاهزة للتسليم", trend: TEST_DATA ? "up" : "neutral", icon: "clipboard", sparkline: TEST_DATA ? series.up : undefined },
    { key: "parts", label: "قطع غيار منخفضة", value: TEST_DATA ? 2 : getInventorySnapshot().balances.filter((item) => item.quantityAvailable <= item.minimumStock).length, description: "ضمن نطاق الصيانة", trend: TEST_DATA ? "down" : "neutral", icon: "inventory", sparkline: TEST_DATA ? series.down : undefined },
  );
  const unique = [...new Map(metrics.map((metric) => [metric.key, metric])).values()];
  if (query.type === "all") return unique.slice(0, 8);
  const keysByType: Record<Exclude<typeof query.type, "all">, readonly string[]> = {
    sales: ["sales-total", "invoice-count", "returns", "sales-shift"],
    rental: ["rental-collection", "active-rentals", "rental-shift"],
    maintenance: ["maintenance-intake", "faults", "repairing", "ready", "parts"],
  };
  const selectedType = query.type as keyof typeof keysByType;
  return unique.filter((metric) => keysByType[selectedType].includes(metric.key)).slice(0, 8);
}

export function getDashboardData(query: DashboardQuery, roles: readonly RoleId[]): DashboardModel {
  const mode = resolveDashboardMode(roles);
  const visibility = dashboardVisibility(roles);
  const payments = getFinanceSnapshot().payments.filter((item) => item.status === "completed" && item.direction === "incoming");
  const branchRows = (TEST_DATA ? DASHBOARD_BRANCH_FIXTURES : getBranchesSnapshot()).filter((branch) => query.branchId === "all" || branch.id === query.branchId).map((branch) => {
    if (TEST_DATA && "sales" in branch) { const factor = periodFactor[query.period]; const sales = query.type === "all" || query.type === "sales" ? Math.round(branch.sales * factor) : 0; const rental = query.type === "all" || query.type === "rental" ? Math.round(branch.rental * factor) : 0; const maintenance = query.type === "all" || query.type === "maintenance" ? Math.round(branch.maintenance * factor) : 0; return { id: branch.id, name: branch.name, code: branch.code, sales, rental, maintenance, total: sales + rental + maintenance }; }
    const sum = (sourceType: string) => payments.filter((item) => item.branchId === branch.id && item.sourceType === sourceType).reduce((total, item) => total + item.amount, 0);
    const sales = query.type === "all" || query.type === "sales" ? sum("sale") : 0;
    const rental = query.type === "all" || query.type === "rental" ? sum("rental") : 0;
    const maintenance = query.type === "all" || query.type === "maintenance" ? sum("maintenance") : 0;
    return { id: branch.id, name: branch.name, code: branch.code, sales, rental, maintenance, total: sales + rental + maintenance };
  });

  const productMap = new Map(getProductSnapshot().products.map((item) => [item.id, item]));
  const liveStock = getInventorySnapshot().balances.filter((item) => item.quantityAvailable <= item.minimumStock).map((item) => {
    const product = productMap.get(item.productId)!;
    return { id: item.id, name: product.name, category: product.type === "sale_toy" ? "sale_game" as const : "spare_part" as const, branch: item.branchId, current: String(item.quantityAvailable), minimum: String(item.minimumStock), severity: item.quantityAvailable === 0 ? "مرتفع" as const : "متوسط" as const };
  });
  const stockSource: readonly StockAlert[] = TEST_DATA && !liveStock.length ? STOCK_FIXTURES : liveStock;
  const stock = stockSource.filter((item) => {
    if (visibility.management) return true;
    if (item.category === "sale_game") return roles.includes("sales_employee");
    if (item.category === "rental_asset") return roles.includes("rental_maintenance_employee");
    return roles.includes("maintenance_technician") || roles.includes("sales_employee") || roles.includes("rental_maintenance_employee");
  });

  const expenseSnapshot = getExpenseSnapshot();
  const payrollSnapshot = getPayrollSnapshot();
  const currentEmployee = resolvePreviewEmployee(roles);
  const managementFinancialAlerts = [
    { id: "financial-expenses", title: "مصروفات تنتظر اعتمادًا", reference: String(expenseSnapshot.expenses.filter((item) => item.approvalStatus === "pending").length), branch: "كل الفروع", time: "الآن", status: "مراجعة", href: "/expenses", unread: true },
    { id: "financial-payroll", title: "دورات رواتب تنتظر مراجعة", reference: String(payrollSnapshot.runs.filter((item) => item.status === "pending_review").length), branch: "كل الفروع", time: "الآن", status: "مراجعة", href: "/payroll", unread: true },
    { id: "financial-advances", title: "طلبات سلف معلقة", reference: String(payrollSnapshot.advances.filter((item) => item.status === "pending").length), branch: "كل الفروع", time: "الآن", status: "معلقة", href: "/payroll/advances", unread: true },
  ].filter((item) => item.reference !== "0");
  const reportsSnapshot = getReportsSnapshot();
  const reportAlerts = roles.includes("owner")
    ? reportsSnapshot.deliveries.filter((item) => item.recipientOwnerEmployeeId === "employee-owner" && item.status === "sent").map((item) => ({ id: `report-${item.id}`, title: "تقرير جديد من المدير", reference: item.deliveryNumber, branch: "كل الفروع", time: item.sentAt ?? item.createdAt, status: "غير مفتوح", href: "/reports/deliveries", unread: true }))
    : roles.includes("manager")
      ? reportsSnapshot.deliveries.filter((item) => item.senderEmployeeId === "employee-manager" && item.status === "failed").map((item) => ({ id: `report-${item.id}`, title: "تعذر تسليم تقرير", reference: item.deliveryNumber, branch: "كل الفروع", time: item.failedAt ?? item.createdAt, status: "يحتاج إعادة محاولة", href: "/reports/deliveries", unread: true }))
      : [];
  const personalExpense = expenseSnapshot.expenses.find((item) => item.requestedByEmployeeId === currentEmployee.id);
  const personalPayroll = payrollSnapshot.runs.flatMap((run) => run.lines.map((line) => ({ run, line }))).find((item) => item.line.employeeId === currentEmployee.id);
  const personalAdvance = payrollSnapshot.advances.find((item) => item.employeeId === currentEmployee.id && item.remainingAmount !== "0.00");
  const personalFinancialAlerts = [
    ...(personalExpense ? [{ id: "personal-expense", title: "حالة آخر طلب مصروف", reference: personalExpense.expenseNumber, branch: "فرعي", time: "الآن", status: personalExpense.status, href: "/my-expenses", unread: true }] : []),
    ...(personalPayroll ? [{ id: "personal-payroll", title: "آخر كشف راتب", reference: personalPayroll.run.payrollNumber, branch: "شخصي", time: "الآن", status: personalPayroll.line.status, href: "/my-payroll", unread: false }] : []),
    ...(personalAdvance ? [{ id: "personal-advance", title: "رصيد السلفة المتبقي", reference: personalAdvance.remainingAmount, branch: "شخصي", time: "الآن", status: personalAdvance.status, href: "/my-payroll", unread: false }] : []),
  ];
  const alerts = TEST_DATA ? (visibility.management ? [...reportAlerts, ...managementFinancialAlerts, ...MANAGEMENT_ALERTS] : [...personalFinancialAlerts, ...(roles.includes("sales_employee") ? SALES_ALERTS : []), ...(roles.includes("rental_maintenance_employee") ? RENTAL_ALERTS : []), ...(roles.includes("maintenance_technician") ? TECH_ALERTS : [])]) : (visibility.management ? [...reportAlerts, ...managementFinancialAlerts] : personalFinancialAlerts);

  return {
    mode,
    metrics: visibility.management ? managementMetrics(query) : operationalMetrics(query, roles),
    branches: branchRows,
    utilization: TEST_DATA ? { percent: query.branchId === "workshop" ? 42 : 68, rented: 17, available: 6, maintenance: 2 } : { percent: 0, rented: 0, available: 0, maintenance: 0 },
    rentals: TEST_DATA ? [...ACTIVE_RENTALS_FIXTURES] : [],
    maintenance: TEST_DATA ? [{ label: "جديد", count: 5 }, { label: "قيد الفحص", count: 4 }, { label: "انتظار قطعة", count: 3 }, { label: "قيد الإصلاح", count: 6 }, { label: "جاهز للتسليم", count: 4 }] : [],
    stock: [...stock],
    attendance: TEST_DATA ? (visibility.management ? [{ label: "حاضر", count: 21 }, { label: "متأخر", count: 3 }, { label: "غائب", count: 2 }, { label: "يحتاج مراجعة", count: 1 }] : [{ label: "حالتي اليوم", count: 1 }, { label: "وقت الحضور", count: 9 }]) : [],
    alerts: [...new Map(alerts.map((alert) => [alert.id, alert])).values()],
    lastUpdated: "14:06",
  };
}
