import { Card } from "@/components/ui/Card";
import type { Employee } from "../types";
export function EmployeeContactCard({ employee }: { employee: Employee }) { return <Card className="employee-detail-card"><span>بيانات التواصل</span><h3>التواصل</h3><dl><div><dt>الهاتف</dt><dd dir="ltr">{employee.phone}</dd></div></dl></Card>; }
