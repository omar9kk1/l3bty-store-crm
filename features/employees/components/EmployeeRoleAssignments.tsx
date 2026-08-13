import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import type { Employee } from "../types";
export function EmployeeRoleAssignments({ employee }: { employee: Employee }) { return <Card className="employee-detail-card"><span>الأدوار والصلاحيات</span><h3>الإسنادات الفعالة</h3><div className="employee-assignment-list">{employee.roleAssignments.filter((item) => item.active).map((item) => <div key={item.roleKey}><ShieldCheck aria-hidden size={18} /><div><strong>{ROLE_TEMPLATES[item.roleKey].labelAr}</strong><small>{item.branchIds === "all" ? "كل الفروع — وصول كامل" : `${item.branchIds.length} فرع/موقع مسند`}</small></div></div>)}</div></Card>; }
