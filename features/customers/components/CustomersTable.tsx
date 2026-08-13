import Link from "next/link";
import { Copy, MoreHorizontal, Pencil, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Customer, CustomerAccess } from "../types";
import { CustomerFlags } from "./CustomerFlags";

const statusLabels = { active: "نشط", inactive: "غير نشط", blocked: "موقوف" } as const;
const statusTones = { active: "success", inactive: "neutral", blocked: "danger" } as const;

export function CustomersTable({ customers, access, branchNames, onEdit, onCopy }: { customers: Customer[]; access: CustomerAccess; branchNames: Record<string, string>; onEdit: (customer: Customer) => void; onCopy: (customer: Customer) => void }) {
  return (
    <div className="ui-card customers-table-wrap">
      <table className="customers-table">
        <thead><tr><th>العميل</th><th>الهاتف</th><th className="customers-col-number">رقم العميل</th><th className="customers-col-branch">الفرع</th><th className="customers-col-activity">آخر نشاط</th><th className="customers-col-count">العمليات</th>{access.canViewFinancial ? <th className="customers-col-financial">المديونية</th> : null}<th>الحالة</th><th><span className="sr-only">الإجراءات</span></th></tr></thead>
        <tbody>{customers.map((customer) => (
          <tr key={customer.id} data-customer-row={customer.id}>
            <td><Link className="customers-table__name" href={`/customers/${customer.id}`}>{customer.name}</Link><CustomerFlags flags={customer.flags.filter((flag) => access.canViewFinancial || flag === "needs_review")} compact /></td>
            <td><button className="customer-phone customer-phone--button" type="button" onClick={() => onCopy(customer)}>{customer.primaryPhone}<Copy aria-hidden size={13} /></button></td>
            <td className="customers-number customers-col-number">{customer.customerNumber}</td>
            <td className="customers-col-branch">{customer.branchIds.map((id) => branchNames[id] ?? id).join("، ")}</td>
            <td className="customers-col-activity">{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(customer.lastActivityAt))}</td>
            <td className="customers-col-count">{customer.totalSales + customer.totalRentals + customer.totalMaintenanceOrders}</td>
            {access.canViewFinancial ? <td className="customers-col-financial">{customer.outstandingBalance.toLocaleString("ar-EG-u-nu-latn")} ج.م</td> : null}
            <td><Badge tone={statusTones[customer.status]}>{statusLabels[customer.status]}</Badge></td>
            <td><details className="customer-row-menu"><summary aria-label={`إجراءات ${customer.name}`}><MoreHorizontal aria-hidden size={18} /></summary><div><Link href={`/customers/${customer.id}`}><UserRound aria-hidden size={15} />عرض الملف</Link>{access.canEdit ? <button type="button" onClick={() => onEdit(customer)}><Pencil aria-hidden size={15} />تعديل</button> : null}<button type="button" onClick={() => onCopy(customer)}><Copy aria-hidden size={15} />نسخ الهاتف</button></div></details></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
