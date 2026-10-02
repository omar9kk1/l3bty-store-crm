"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { money } from "@/features/finance/components/finance-labels";
import { isExpenseAdmin } from "../permissions";
import { useExpenses } from "../hooks/use-expenses";
import { expenseStatusLabels, expenseTone } from "./expense-labels";

const auditLabels: Record<string, string> = {
  created: "تم تسجيل المصروف مباشرة",
  submitted: "تم إرسال طلب المصروف للمراجعة",
  review_approved: "تم اعتماد المصروف",
  review_rejected: "تم رفض المصروف",
  review_needs_information: "طُلب استكمال بيانات المصروف",
  paid: "تم دفع المصروف من الخزنة",
  cancelled: "تم إلغاء المصروف",
  reversed: "تم إلغاء حركة الدفع",
};

export function ExpensesPage() {
  const { roles, availableBranches } = useShell();
  const search = useSearchParams();
  const state = search.get("state") ?? "normal";
  const data = useExpenses();
  const employees = useEmployees();
  const [selected, setSelected] = useState<string | null>(null);

  if (!isExpenseAdmin(roles)) return <PermissionDeniedState />;
  if (state === "loading") return <div className="expense-skeleton" aria-label="جارٍ التحميل" />;
  if (state === "error") return <Card className="expense-state">تعذر تحميل المصروفات الآن.</Card>;

  const status = search.get("status") ?? "all";
  const branch = search.get("branch") ?? "all";
  const category = search.get("category") ?? "all";
  const source = state === "empty" ? [] : data.expenses;
  const rows = source.filter((item) =>
    (status === "all" || item.status === status) &&
    (branch === "all" || item.branchId === branch) &&
    (category === "all" || item.categoryId === category));
  const item = data.expenses.find((expense) => expense.id === selected);
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name]));
  const branchNames = new Map(availableBranches.map((availableBranch) => [availableBranch.id, availableBranch.nameAr]));
  branchNames.set("general", "مصروف عام");
  const categoryOptions = [...new Map(source.map((expense) => [expense.categoryId, expense.categoryName])).entries()];
  const registered = source.filter((expense) => !["cancelled", "reversed"].includes(expense.status));
  const totalExpenses = registered.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const generalExpenses = registered.filter((expense) => expense.branchId === "general").length;

  return <div className="expenses-page">
    <header className="expenses-header">
      <div><span>الإدارة المالية</span><h2>المصروفات</h2><p>سجّل المصروف مباشرة وتابع مصروفات المكان.</p></div>
      <Link className="ui-button ui-button--primary ui-button--md expenses-add-link" href="/my-expenses">إضافة مصروف</Link>
    </header>

    {state === "offline" ? <div className="expenses-offline">أنت غير متصل الآن — يمكنك العرض فقط حتى يعود الاتصال.</div> : null}
    <section className="expenses-summary expenses-summary--simple">
      <Card><span>المصروفات المسجلة</span><strong>{registered.length}</strong><small>كل المصروفات الحالية</small></Card>
      <Card><span>إجمالي المصروفات</span><strong>{money(totalExpenses)}</strong><small>إجمالي التكلفة المسجلة</small></Card>
      <Card><span>مصروفات عامة</span><strong>{generalExpenses}</strong><small>غير مرتبطة بفرع</small></Card>
    </section>

    {!source.length ? <Card className="expense-empty expense-empty--main">
      <div className="expense-empty__icon" aria-hidden>✓</div>
      <h3>لا توجد مصروفات حتى الآن</h3>
      <p>عند إضافة أول مصروف سيظهر هنا لمراجعته ومتابعة دفعه.</p>
      <Link className="ui-button ui-button--primary ui-button--md" href="/my-expenses">إضافة أول مصروف</Link>
    </Card> : <>
      <Card className="expenses-filter-card"><form className="expenses-filters">
        <select name="branch" defaultValue={branch} aria-label="نطاق المصروف"><option value="all">كل المصروفات</option><option value="general">مصروفات عامة</option>{availableBranches.filter((availableBranch) => availableBranch.id !== "all").map((availableBranch) => <option value={availableBranch.id} key={availableBranch.id}>{availableBranch.nameAr}</option>)}</select>
        <select name="category" defaultValue={category} aria-label="نوع المصروف"><option value="all">كل الأنواع</option>{categoryOptions.map(([categoryId, categoryName]) => <option key={categoryId} value={categoryId}>{categoryName}</option>)}</select>
        <select name="status" defaultValue={status} aria-label="حالة المصروف"><option value="all">كل الحالات</option><option value="approved">مسجلة</option></select>
        <Button type="submit">عرض</Button>
      </form></Card>

      <Card className="expenses-list">
        <div className="expenses-table-wrap"><table><thead><tr><th>رقم الطلب</th><th>الموظف</th><th>النطاق</th><th>المصروف</th><th>المبلغ</th><th>الحالة</th><th></th></tr></thead><tbody>{rows.map((expense) => <tr key={expense.id}><td>{expense.expenseNumber}</td><td>{employeeNames.get(expense.requestedByEmployeeId) ?? "—"}</td><td>{branchNames.get(expense.branchId) ?? "مصروف عام"}</td><td>{expense.categoryName}</td><td>{money(Number(expense.amount))}</td><td><Badge tone={expenseTone(expense.status)}>{expenseStatusLabels[expense.status]}</Badge></td><td><Button size="sm" onClick={() => setSelected(expense.id)}>عرض</Button></td></tr>)}</tbody></table></div>
        <div className="expense-mobile-list">{rows.map((expense) => <button className="expense-mobile-card" onClick={() => setSelected(expense.id)} key={expense.id}><header><strong>{expense.expenseNumber}</strong><Badge tone={expenseTone(expense.status)}>{expenseStatusLabels[expense.status]}</Badge></header><span>{employeeNames.get(expense.requestedByEmployeeId) ?? "—"} · {expense.categoryName}</span><b>{money(Number(expense.amount))}</b></button>)}</div>
        {!rows.length ? <div className="expense-empty"><h3>لا توجد نتائج بهذه الفلاتر</h3><p>غيّر الفلاتر لعرض المصروفات الأخرى.</p></div> : null}
      </Card>
    </>}

    <Drawer open={!!item} onOpenChange={(open) => !open && setSelected(null)} title={item?.expenseNumber ?? "تفاصيل المصروف"} description="راجع البيانات ثم اختر الإجراء المناسب." variant="auxiliary">
      {item ? <div className="expense-details">
        <dl><div><dt>الموظف</dt><dd>{employeeNames.get(item.requestedByEmployeeId) ?? "—"}</dd></div><div><dt>النطاق</dt><dd>{branchNames.get(item.branchId) ?? "مصروف عام"}</dd></div><div><dt>المبلغ</dt><dd>{money(Number(item.amount))}</dd></div><div><dt>الملاحظة</dt><dd>{item.description}</dd></div></dl>
        {data.audits.some((audit) => audit.expenseId === item.id) ? <section className="expense-history"><h3>سجل المصروف</h3>{data.audits.filter((audit) => audit.expenseId === item.id).map((audit) => <div key={audit.id}><strong>{auditLabels[audit.action] ?? "تم تحديث المصروف"}</strong><span>{audit.reason}</span></div>)}</section> : null}
      </div> : null}
    </Drawer>
  </div>;
}
