import { Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { CustomerActivityEvent } from "../types";

export function CustomerActivityTimeline({ events }: { events: CustomerActivityEvent[] }) {
  return (
    <Card className="customer-detail-card customer-timeline">
      <div className="customer-detail-card__heading"><div><span>سجل النشاط</span><h3>آخر التحديثات المتاحة</h3></div><Activity aria-hidden size={20} /></div>
      {events.length ? <ol>{events.map((event) => <li key={event.id}><span className="customer-timeline__dot" /><div><div className="customer-timeline__title"><strong>{event.title}</strong><time>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurredAt))}</time></div><p>{event.description}</p><small>{event.reference}</small></div></li>)}</ol> : <p className="customers-muted">لا توجد أنشطة متاحة لهذا الدور.</p>}
    </Card>
  );
}
