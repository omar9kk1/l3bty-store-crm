"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Card } from "@/components/ui/Card";
import { useExpenses } from "@/features/expenses/hooks/use-expenses";
import { usePayroll } from "@/features/payroll/hooks/use-payroll";
import { useShifts } from "@/features/shifts/hooks/use-shifts";
import { canViewFinance } from "../permissions";
import { useFinance } from "../hooks/use-finance";
import {
  buildFinancialOverview,
  getFinancialPeriodRange,
  getFinancialReferenceDate,
} from "../services/financial-overview";
import { filterFinanceByBranch } from "../services/finance-view";
import { money, moneyAmount, paymentSourceLabels } from "./finance-labels";

type OverviewPeriod = "all" | "day" | "week" | "month";

export function FinancePage() {
  const { roles, activeBranch, availableBranches } = useShell();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = params.get("state") ?? "normal";
  const finance = useFinance();
  const expenses = useExpenses();
  const payroll = usePayroll();
  const { shifts } = useShifts();

  if (!canViewFinance(roles)) return <PermissionDeniedState />;
  if (state === "loading") return <div className="finance-page"><Card className="finance-state">جارٍ تحميل الملخص المالي…</Card></div>;
  if (state === "error") return <div className="finance-page"><Card className="finance-state"><h2>تعذر تحميل البيانات المالية</h2><p>FIN-MOCK-503</p></Card></div>;

  const requestedBranch = params.get("branch") ?? activeBranch.id;
  const allowedBranchIds = new Set(availableBranches.map((item) => item.id));
  const branch = allowedBranchIds.has(requestedBranch) ? requestedBranch : activeBranch.id;
  const requestedPeriod = params.get("period");
  const period: OverviewPeriod = requestedPeriod === "day" || requestedPeriod === "week" || requestedPeriod === "month" ? requestedPeriod : "all";
  const referenceDate = getFinancialReferenceDate(finance, expenses, payroll);
  const range = getFinancialPeriodRange(period, referenceDate);
  const overview = buildFinancialOverview(finance, expenses, payroll, branch, range);
  const scoped = filterFinanceByBranch(finance, shifts, branch);
  const reportQuery = new URLSearchParams({
    branch,
    period: period === "all" ? "custom" : period === "day" ? "daily" : period === "week" ? "weekly" : "monthly",
    from: range.dateFrom ?? "2000-01-01",
    to: range.dateTo ?? referenceDate,
  });

  function setFilter(key: "branch" | "period", value: string) {
    const next = new URLSearchParams(params.toString());
    if ((key === "branch" && value === activeBranch.id) || (key === "period" && value === "all")) next.delete(key);
    else next.set(key, value);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  return <div className="finance-page finance-overview-page">
    <header className="finance-header finance-overview-header">
      <div>
        <span>الإدارة المالية</span>
        <h2>ملخص الحسابات</h2>
        <p>صورة واحدة تجمع التحصيلات والمصروفات والرواتب وصافي الحسابات.</p>
      </div>
      <nav>
        <Link href="/finance/cashboxes">الخزائن</Link>
        <Link href="/finance/payments">الحركات</Link>
        <Link href="/expenses">المصروفات</Link>
        <Link href="/payroll">الرواتب</Link>
      </nav>
    </header>

    <Card className="finance-overview-filters">
      <label htmlFor="finance-branch">الفرع
        <select id="finance-branch" value={branch} onChange={(event) => setFilter("branch", event.target.value)}>
          {availableBranches.map((item) => <option key={item.id} value={item.id}>{item.id === "all" ? "كل الفروع" : item.nameAr}</option>)}
        </select>
      </label>
      <label htmlFor="finance-period">الفترة
        <select id="finance-period" value={period} onChange={(event) => setFilter("period", event.target.value)}>
          <option value="all">كل المدة</option>
          <option value="day">آخر يوم مسجل</option>
          <option value="week">آخر 7 أيام</option>
          <option value="month">آخر 30 يومًا</option>
        </select>
      </label>
      <Link className="finance-report-link" href={`/reports/financial-summary?${reportQuery}`}>فتح التقرير المالي الشامل</Link>
    </Card>

    <section className="finance-overview-primary">
      <Card className={`finance-net-card${overview.net < 0 ? " finance-net-card--negative" : ""}`}>
        <span>صافي الحسابات</span>
        <strong className="finance-net-amount">
          <bdi>{moneyAmount(overview.net)}</bdi>
          <span>ج.م</span>
        </strong>
        <small>التحصيلات ناقص المصروفات والرواتب والمدفوعات الأخرى</small>
      </Card>
      <div className="finance-overview-totals">
        <Card><span>إجمالي التحصيلات</span><strong>{money(overview.collections)}</strong><small>{overview.collectionCount} حركة تحصيل</small></Card>
        <Card><span>إجمالي المصروفات</span><strong>{money(overview.expenses)}</strong><small>{overview.expenseCount} مصروف مسجل</small></Card>
        <Card><span>الرواتب المدفوعة</span><strong>{money(overview.paidPayroll)}</strong><small>{overview.paidPayrollCount} راتب مدفوع</small></Card>
        <Card><span>مدفوعات أخرى</span><strong>{money(overview.otherOutgoings)}</strong><small>مثل السلف والمرتجعات</small></Card>
      </div>
    </section>

    <section className="finance-summary finance-summary--overview">
      <Card><span>إجمالي أرصدة الخزائن الآن</span><strong>{money(overview.cashboxBalance)}</strong></Card>
      <Card><span>رواتب جاهزة ولم تُدفع</span><strong>{money(overview.unpaidPayroll)}</strong></Card>
      <Card><span>الحركات المالية</span><strong>{scoped.payments.length}</strong></Card>
      <Card><span>ورديات مفتوحة</span><strong>{scoped.shifts.filter((item) => item.status === "open").length}</strong></Card>
      <Card><span>فروقات للمراجعة</span><strong>{scoped.shifts.filter((item) => item.status === "closing_review").length}</strong></Card>
    </section>

    {state === "empty" ? <Card className="finance-state">لا توجد بيانات مالية في النطاق المختار.</Card> : <div className="finance-chart-grid finance-overview-details">
      <Card>
        <h3>التحصيل حسب المصدر</h3>
        {overview.collectionBySource.length ? overview.collectionBySource.map((item) => <div className="finance-distribution" key={item.source}><span>{paymentSourceLabels[item.source]}</span><strong>{money(item.total)}</strong></div>) : <p className="finance-empty-note">لا توجد تحصيلات في الفترة المختارة.</p>}
      </Card>
      <Card>
        <h3>ملخص الخارج</h3>
        <div className="finance-distribution"><span>المصروفات</span><strong>{money(overview.expenses)}</strong></div>
        <div className="finance-distribution"><span>الرواتب المدفوعة</span><strong>{money(overview.paidPayroll)}</strong></div>
        <div className="finance-distribution"><span>المدفوعات الأخرى</span><strong>{money(overview.otherOutgoings)}</strong></div>
        <div className="finance-distribution finance-distribution--total"><span>الإجمالي</span><strong>{money(overview.totalOutgoings)}</strong></div>
      </Card>
      <Card className="finance-report-card">
        <h3>التقرير المالي للمالك</h3>
        <p>تقرير واحد يشمل التحصيلات والمصروفات والرواتب والصافي، ويمكن طباعته أو حفظ نسخة ثابتة منه.</p>
        <Link className="finance-report-link" href={`/reports/financial-summary?${reportQuery}`}>عرض وتجهيز التقرير</Link>
      </Card>
    </div>}
  </div>;
}
