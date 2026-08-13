import Link from "next/link";
import { Copy, Pencil, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Customer, CustomerAccess } from "../types";
import { CustomerFlags } from "./CustomerFlags";

const statusLabels = { active: "نشط", inactive: "غير نشط", blocked: "موقوف" } as const;
const statusTones = { active: "success", inactive: "neutral", blocked: "danger" } as const;

export function CustomerMobileCard({ customer, access, onEdit, onCopy }: { customer: Customer; access: CustomerAccess; onEdit: () => void; onCopy: () => void }) {
  return (
    <Card className="customer-mobile-card" data-customer-card={customer.id}>
      <div className="customer-mobile-card__heading">
        <div><h3>{customer.name}</h3><span className="customers-number">{customer.customerNumber}</span></div>
        <Badge tone={statusTones[customer.status]}>{statusLabels[customer.status]}</Badge>
      </div>
      <a className="customer-phone" href={`tel:${customer.primaryPhone}`}>{customer.primaryPhone}</a>
      <dl className="customer-mobile-card__meta">
        <div><dt>آخر نشاط</dt><dd>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(customer.lastActivityAt))}</dd></div>
        {access.canViewFinancial && customer.outstandingBalance > 0 ? <div><dt>المديونية</dt><dd>{customer.outstandingBalance.toLocaleString("ar-EG-u-nu-latn")} ج.م</dd></div> : null}
      </dl>
      <CustomerFlags flags={customer.flags.filter((flag) => access.canViewFinancial || flag === "needs_review")} compact />
      <div className="customer-mobile-card__actions">
        <Link className="ui-button ui-button--primary ui-button--sm" href={`/customers/${customer.id}`}><UserRound aria-hidden size={16} />عرض الملف</Link>
        <Button type="button" size="sm" icon={<Copy aria-hidden size={15} />} onClick={onCopy}>نسخ الهاتف</Button>
        {access.canEdit ? <Button type="button" size="sm" variant="ghost" icon={<Pencil aria-hidden size={15} />} onClick={onEdit}>تعديل</Button> : null}
      </div>
    </Card>
  );
}
