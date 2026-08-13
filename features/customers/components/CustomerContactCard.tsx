import { Copy, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Customer } from "../types";

export function CustomerContactCard({ customer, onCopy }: { customer: Customer; onCopy: (phone: string) => void }) {
  return (
    <Card className="customer-detail-card customer-contact-card">
      <div className="customer-detail-card__heading"><div><span>بيانات التواصل</span><h3>أرقام الهاتف</h3></div><Phone aria-hidden size={20} /></div>
      <div className="customer-contact-row"><div><span>الرقم الأساسي</span><a href={`tel:${customer.primaryPhone}`}>{customer.primaryPhone}</a></div><Button type="button" size="sm" variant="ghost" icon={<Copy aria-hidden size={15} />} onClick={() => onCopy(customer.primaryPhone)}>نسخ</Button></div>
      {customer.alternatePhones.length ? customer.alternatePhones.map((phone) => <div className="customer-contact-row" key={phone}><div><span>رقم بديل</span><a href={`tel:${phone}`}>{phone}</a></div><Button type="button" size="sm" variant="ghost" icon={<Copy aria-hidden size={15} />} onClick={() => onCopy(phone)}>نسخ</Button></div>) : <p className="customers-muted">لا يوجد رقم بديل.</p>}
    </Card>
  );
}
