import { CalendarX2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
export function AttendanceEmptyState({ message = "لا توجد سجلات ضمن النطاق الحالي." }: { message?: string }) { return <Card className="attendance-state"><CalendarX2 aria-hidden size={30} /><h3>لا توجد بيانات</h3><p>{message}</p></Card>; }
