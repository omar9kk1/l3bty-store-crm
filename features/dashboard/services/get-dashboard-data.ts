import type { RoleId } from "@/permissions/types";
import {
  ACTIVE_RENTALS_FIXTURES,
  DASHBOARD_BRANCH_FIXTURES,
  MANAGEMENT_ALERTS,
  RENTAL_ALERTS,
  SALES_ALERTS,
  STOCK_FIXTURES,
  TECH_ALERTS,
} from "../fixtures";
import { dashboardVisibility, resolveDashboardMode } from "../permissions";
import type { DashboardMetric, DashboardModel, DashboardPeriod, DashboardQuery } from "../types";
import { SALE_INVOICE_FIXTURES } from "@/features/sales/fixtures";
import { getInventorySnapshot } from "@/features/inventory/services/inventory-service";
import { getProductSnapshot } from "@/features/products/services/product-store";
import { getFinanceSnapshot } from "@/features/finance/services/finance-store";
import { getShiftSnapshot } from "@/features/shifts/services/shift-store";
import { getExpenseSnapshot } from "@/features/expenses/services/expense-store";
import { getPayrollSnapshot } from "@/features/payroll/services/payroll-store";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { getReportsSnapshot } from "@/features/reports/services/report-store";

const periodFactor: Record<DashboardPeriod, number> = { today: 1, week: 6.35, month: 25.4 };
const branchFactor: Record<string, number> = { all: 2.42, main: 1, "branch-2": 0.72, "branch-3": 0.58, workshop: 0.31 };
const scale = (value: number, query: DashboardQuery) => Math.round(value * periodFactor[query.period] * (branchFactor[query.branchId] ?? 1));
const completedSales = SALE_INVOICE_FIXTURES.filter((invoice) => invoice.status !== "cancelled");
const fixtureSalesTotal = completedSales.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
const fixtureSalesCount = completedSales.length;

const series = {
  up: [18, 22, 21, 28, 31, 35, 42, 47],
  down: [46, 43, 40, 41, 35, 31, 27, 23],
  neutral: [30, 31, 29, 30, 32, 30, 31, 30],
} as const;

function managementMetrics(query: DashboardQuery): DashboardMetric[] {
  const finance = getFinanceSnapshot();
  const shifts = getShiftSnapshot().shifts;
  const scopedCashboxes = finance.cashboxes.filter((item) => query.branchId === "all" || item.branchId === query.branchId);
  const latestCollection = finance.payments.find((item) => item.direction === "incoming" && item.status === "completed");
  const all = [
    { key: "sales", label: "مبيعات الفترة", value: scale(fixtureSalesTotal, query), unit: "ج.م", comparison: "+12.4%", description: `${fixtureSalesCount} فواتير Mock من مصدر المبيعات`, trend: "up", icon: "sales", sparkline: series.up },
    { key: "rental", label: "إيرادات التأجير", value: scale(29800, query), unit: "ج.م", comparison: "+7.8%", description: "من أصول التأجير النشطة", trend: "up", icon: "rentals", sparkline: series.up },
    { key: "maintenance", label: "إيرادات الصيانة", value: scale(18400, query), unit: "ج.م", comparison: "-2.1%", description: "أوامر مكتملة خلال الفترة", trend: "down", icon: "maintenance", sparkline: series.down },
    { key: "cash", label: "رصيد الخزائن الآن", value: scopedCashboxes.reduce((sum, item) => sum + item.currentBalance, 0), unit: "ج.م", comparison: `${shifts.filter((item) => item.status === "open" && (query.branchId === "all" || item.branchId === query.branchId)).length} ورديات مفتوحة`, description: latestCollection ? `آخر تحصيل ${latestCollection.paymentNumber}` : "لا توجد تحصيلات", trend: "neutral", icon: "finance" },
  ] satisfies DashboardMetric[];
  return query.type === "all" ? all : all.filter((metric) => metric.key === query.type || metric.key === "cash");
}

function operationalMetrics(query: DashboardQuery, roles: readonly RoleId[]): DashboardMetric[] {
  const metrics: DashboardMetric[] = [];
  const employeeId = roles.includes("sales_employee") && roles.includes("rental_maintenance_employee") ? "employee-dual" : roles.includes("sales_employee") ? "employee-sales" : "employee-rental";
  const shift = getShiftSnapshot().shifts.find((item) => item.employeeId === employeeId && item.status === "open");
  const shiftCollections = getFinanceSnapshot().payments.filter((item) => item.shiftId === shift?.id && item.direction === "incoming").reduce((sum, item) => sum + item.amount, 0);
  if (roles.includes("sales_employee")) metrics.push(
    { key: "sales-total", label: "مبيعات اليوم", value: scale(fixtureSalesTotal, query), unit: "ج.م", comparison: "+8.1%", description: "من Mock Sales Data الجديدة", trend: "up", icon: "sales", sparkline: series.up },
    { key: "invoice-count", label: "عدد الفواتير", value: fixtureSalesCount, description: "فاتورة مكتملة ضمن النطاق", trend: "up", icon: "clipboard", sparkline: series.up },
    { key: "returns", label: "مرتجعات معلقة", value: 3, description: "تحتاج مراجعة", trend: "neutral", icon: "activity", sparkline: series.neutral },
    { key: "sales-shift", label: "رصيد ورديتي", value: (shift?.openingBalance ?? 0) + shiftCollections, unit: "ج.م", description: shift ? "الوردية مفتوحة" : "لا توجد وردية مفتوحة", trend: "neutral", icon: "finance" },
  );
  if (roles.includes("rental_maintenance_employee")) metrics.push(
    { key: "rental-collection", label: "تحصيلات التأجير", value: scale(6850, query), unit: "ج.م", comparison: "+5.4%", description: "ضمن الفرع والوردية", trend: "up", icon: "rentals", sparkline: series.up },
    { key: "active-rentals", label: "التأجيرات النشطة", value: 7, description: "3 تقترب من الانتهاء", trend: "neutral", icon: "rentals", sparkline: series.neutral },
    { key: "maintenance-intake", label: "طلبات صيانة مستلمة", value: 5, description: "طلبان بانتظار الفحص", trend: "up", icon: "maintenance", sparkline: series.up },
    { key: "rental-shift", label: "رصيد ورديتي", value: (shift?.openingBalance ?? 0) + shiftCollections, unit: "ج.م", description: shift ? "تحصيلات الوردية الحالية" : "لا توجد وردية مفتوحة", trend: "neutral", icon: "finance" },
  );
  if (roles.includes("maintenance_technician")) metrics.push(
    { key: "faults", label: "البلاغات الجديدة", value: 4, description: "بلاغان بأولوية مرتفعة", trend: "up", icon: "notifications", sparkline: series.up },
    { key: "repairing", label: "قيد الفحص أو الإصلاح", value: 9, description: "أوامر مسندة إليك", trend: "neutral", icon: "maintenance", sparkline: series.neutral },
    { key: "ready", label: "جاهزة للتسليم", value: 3, description: "تم تحديثها اليوم", trend: "up", icon: "clipboard", sparkline: series.up },
    { key: "parts", label: "قطع غيار منخفضة", value: 2, description: "ضمن نطاق الصيانة", trend: "down", icon: "inventory", sparkline: series.down },
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
  const branchRows = DASHBOARD_BRANCH_FIXTURES
    .filter((branch) => query.branchId === "all" || branch.id === query.branchId)
    .map((branch) => {
      const factor = periodFactor[query.period];
      const sales = query.type === "all" || query.type === "sales" ? Math.round(branch.sales * factor) : 0;
      const rental = query.type === "all" || query.type === "rental" ? Math.round(branch.rental * factor) : 0;
      const maintenance = query.type === "all" || query.type === "maintenance" ? Math.round(branch.maintenance * factor) : 0;
      return { ...branch, sales, rental, maintenance, total: sales + rental + maintenance };
    });

  const productMap = new Map(getProductSnapshot().products.map((item) => [item.id, item]));
  const liveStock = getInventorySnapshot().balances.filter((item) => item.quantityAvailable <= item.minimumStock).map((item) => {
    const product = productMap.get(item.productId)!;
    return { id: item.id, name: product.name, category: product.type === "sale_toy" ? "sale_game" as const : "spare_part" as const, branch: item.branchId, current: String(item.quantityAvailable), minimum: String(item.minimumStock), severity: item.quantityAvailable === 0 ? "مرتفع" as const : "متوسط" as const };
  });
  const stockSource = liveStock.length ? liveStock : STOCK_FIXTURES;
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
  ];
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
  const alerts = visibility.management
    ? [...reportAlerts, ...managementFinancialAlerts, ...MANAGEMENT_ALERTS]
    : [...personalFinancialAlerts, ...(roles.includes("sales_employee") ? SALES_ALERTS : []), ...(roles.includes("rental_maintenance_employee") ? RENTAL_ALERTS : []), ...(roles.includes("maintenance_technician") ? TECH_ALERTS : [])];

  return {
    mode,
    metrics: visibility.management ? managementMetrics(query) : operationalMetrics(query, roles),
    branches: branchRows,
    utilization: { percent: query.branchId === "workshop" ? 42 : 68, rented: 17, available: 6, maintenance: 2 },
    rentals: [...ACTIVE_RENTALS_FIXTURES],
    maintenance: [
      { label: "جديد", count: 5 }, { label: "قيد الفحص", count: 4 }, { label: "انتظار قطعة", count: 3 }, { label: "قيد الإصلاح", count: 6 }, { label: "جاهز للتسليم", count: 4 },
    ],
    stock: [...stock],
    attendance: visibility.management
      ? [{ label: "حاضر", count: 21 }, { label: "متأخر", count: 3 }, { label: "غائب", count: 2 }, { label: "يحتاج مراجعة", count: 1 }]
      : [{ label: "حالتي اليوم", count: 1 }, { label: "وقت الحضور", count: 9 }],
    alerts: [...new Map(alerts.map((alert) => [alert.id, alert])).values()],
    lastUpdated: "14:06",
  };
}
