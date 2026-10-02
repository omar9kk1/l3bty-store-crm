"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useShell } from "@/components/shell/ShellContext";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useSales } from "../hooks/use-sales";
import { canAccessSaleBranch } from "../permissions";
import type { SaleInvoiceStatus } from "../types";

const money = (value: number) =>
  `${value.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 2 })} ج.م`;

const statusLabels: Record<SaleInvoiceStatus, string> = {
  draft: "مسودة",
  completed: "مكتملة",
  partially_returned: "مرتجع جزئي",
  fully_returned: "مرتجع كامل",
  cancelled: "ملغاة",
};

export function SalesManagementOverview() {
  const { roles, activeBranch, availableBranches } = useShell();
  const { invoices, returns } = useSales();
  const branches = useBranches();
  const employees = useEmployees();
  const manager = roles.includes("manager");
  const allowedBranchIds = availableBranches.map((branch) => branch.id);
  const scopedInvoices = invoices.filter(
    (invoice) =>
      canAccessSaleBranch(roles, invoice.branchId, allowedBranchIds) &&
      (activeBranch.id === "all" || invoice.branchId === activeBranch.id),
  );
  const activeInvoices = scopedInvoices.filter(
    (invoice) => invoice.status !== "cancelled",
  );
  const scopedReturns = returns.filter((record) =>
    scopedInvoices.some((invoice) => invoice.id === record.invoiceId),
  );
  const total = activeInvoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0,
  );
  const collected = activeInvoices.reduce(
    (sum, invoice) => sum + invoice.paidAmount,
    0,
  );
  const remaining = activeInvoices.reduce(
    (sum, invoice) => sum + invoice.remainingAmount,
    0,
  );
  const returned = scopedReturns.reduce(
    (sum, record) => sum + record.refundAmount,
    0,
  );
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee.name]),
  );

  return (
    <div className="sales-page sales-management-overview">
      <header className="sales-header">
        <div>
          <span>المبيعات</span>
          <h2>{manager ? "إدارة المبيعات" : "متابعة المبيعات"}</h2>
          <p>
            شاهد نتيجة البيع والفواتير المسجلة، بينما ينفذ موظف المبيعات عملية
            البيع من حسابه.
          </p>
        </div>
        <div>
          <Link
            className="ui-button ui-button--primary ui-button--md"
            href="/sales/invoices"
          >
            فواتير المبيعات
          </Link>
          <Link
            className="ui-button ui-button--secondary ui-button--md"
            href="/sales/returns?mode=return"
          >
            المرتجعات
          </Link>
          <Link
            className="ui-button ui-button--secondary ui-button--md"
            href="/sales/returns?mode=exchange"
          >
            الاستبدال
          </Link>
        </div>
      </header>

      <section className="sales-summary">
        <Card>
          <span>إجمالي المبيعات</span>
          <strong>{money(total)}</strong>
        </Card>
        <Card>
          <span>المبلغ المحصل</span>
          <strong>{money(collected)}</strong>
        </Card>
        <Card>
          <span>المبالغ المتبقية</span>
          <strong>{money(remaining)}</strong>
        </Card>
        <Card>
          <span>قيمة المرتجعات</span>
          <strong>{money(returned)}</strong>
        </Card>
        <Card>
          <span>عدد الفواتير</span>
          <strong>{scopedInvoices.length.toLocaleString("ar-EG-u-nu-latn")}</strong>
        </Card>
      </section>

      {scopedInvoices.length ? (
        <Card className="sales-list">
          <div className="sales-management-title">
            <div>
              <span>آخر العمليات</span>
              <h3>أحدث فواتير البيع</h3>
            </div>
            <Link href="/sales/invoices">عرض كل الفواتير</Link>
          </div>
          <div className="sales-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الفاتورة</th>
                  <th>الفرع</th>
                  <th>الموظف</th>
                  <th>الإجمالي</th>
                  <th>المحصل</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {scopedInvoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoiceNumber}</strong>
                      <span>
                        {new Date(invoice.createdAt).toLocaleDateString(
                          "ar-EG-u-nu-latn",
                        )}
                      </span>
                    </td>
                    <td>{branchMap.get(invoice.branchId) ?? "فرع غير معروف"}</td>
                    <td>
                      {employeeMap.get(invoice.employeeId) ?? "موظف غير معروف"}
                    </td>
                    <td>{money(invoice.totalAmount)}</td>
                    <td>{money(invoice.paidAmount)}</td>
                    <td>
                      <Badge
                        tone={
                          invoice.status === "completed"
                            ? "success"
                            : invoice.status === "cancelled"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {statusLabels[invoice.status]}
                      </Badge>
                    </td>
                    <td>
                      <Link href={`/sales/invoices/${invoice.id}`}>عرض</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="sale-state">
          <h3>لا توجد مبيعات مسجلة حتى الآن</h3>
          <p>ستظهر هنا الفواتير التي ينشئها موظفو المبيعات.</p>
        </Card>
      )}
    </div>
  );
}
