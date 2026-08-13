import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Employee } from "../types";
export function EmployeeBranchAssignments({ employee, branchNames }: { employee: Employee; branchNames: Record<string, string> }) { return <Card className="employee-detail-card"><span>الفروع المسندة</span><h3>نطاق العمل</h3><div className="employee-branch-list">{employee.assignedBranchIds.map((id) => <div key={id}><MapPin aria-hidden size={16} /><span>{branchNames[id] ?? id}</span>{id === employee.primaryBranchId ? <b>أساسي</b> : null}</div>)}</div></Card>; }
