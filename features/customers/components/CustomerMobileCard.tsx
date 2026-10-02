import Link from "next/link";
import { Copy, Pencil, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Customer, CustomerAccess } from "../types";
import { CustomerFlags } from "./CustomerFlags";

const statusLabels = { active: "نشط", inactive: "غير نشط", blocked: "موقوف" } as const;
const statusTones = { active: "success", inactive: "neutral", blocked: "danger" } as const;

export function CustomerMobileCard({ customer, access, onEdit, onCopy, onDelete }: { customer: Customer; access: CustomerAccess; onEdit: () => void; onCopy: () => void; onDelete: () => void }) {
  return (
    <Card className="customer-mobile-card" data-customer-card={customer.id}>
      <div className="customer-mobile-card__heading">
        <div><h3>{customer.name}</h3><span className="customers-number">{customer.customerNumber}</span></div>
        <Badge tone={statusTones[customer.status]}>{statusLabels[customer.status]}</Badge>
      </div>
      <a className="customer-phone" href={`tel:${customer.primaryPhone}`}>{customer.primaryPhone}</a>
      <dl className="customer-mobile-card__meta">
        <div><dt>آخر نشاط</dt><dd>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(new Date(customer.lastActivityAt))}</dd></div>
      </dl>
      <CustomerFlags flags={customer.flags} compact />
      <div className="customer-mobile-card__actions">
        <Link className="ui-button ui-button--primary ui-button--sm" href={`/customers/${customer.id}`}><UserRound aria-hidden size={16} />عرض الملف</Link>
        <Button type="button" size="sm" icon={<Copy aria-hidden size={15} />} onClick={onCopy}>نسخ الهاتف</Button>
        {access.canEdit ? <Button type="button" size="sm" variant="ghost" icon={<Pencil aria-hidden size={15} />} onClick={onEdit}>تعديل</Button> : null}
        {access.canDeleteDirectly || access.canRequestDelete ? <Button type="button" size="sm" variant="ghost" icon={<Trash2 aria-hidden size={15} />} onClick={onDelete}>{access.canDeleteDirectly ? "حذف" : "طلب حذف"}</Button> : null}
      </div>
    </Card>
  );
}
