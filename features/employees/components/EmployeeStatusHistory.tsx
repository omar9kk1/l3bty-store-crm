import { Card } from "@/components/ui/Card";
import type { Employee } from "../types";
import { employeeStatusLabels } from "./employee-labels";
export function EmployeeStatusHistory({ employee }: { employee: Employee }) { return <Card className="employee-detail-card"><span>سجل الحالة</span><h3>التغييرات الإدارية</h3><ol className="employee-status-history">{employee.statusHistory.map((event) => <li key={event.id}><strong>{employeeStatusLabels[event.status]}</strong><p>{event.reason}</p><small>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.at))} · {event.by}</small></li>)}</ol></Card>; }
