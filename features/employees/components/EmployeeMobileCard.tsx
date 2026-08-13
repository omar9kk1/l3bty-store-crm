import Link from "next/link";
import { Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import type { Employee } from "../types";
import { employeeStatusLabels, employeeStatusTones } from "./employee-labels";
export function EmployeeMobileCard({ employee, branchNames }: { employee: Employee; branchNames: Record<string, string> }) { return <Card className="employee-mobile-card"><div className="employee-mobile-card__head"><span><UserRound aria-hidden size={20} /></span><div><h3>{employee.name}</h3><bdi>{employee.employeeNumber}</bdi></div><Badge tone={employeeStatusTones[employee.status]}>{employeeStatusLabels[employee.status]}</Badge></div><p>{employee.jobTitle}</p><a href={`tel:${employee.phone}`} dir="ltr"><Phone aria-hidden size={15} />{employee.phone}</a><div className="employee-role-chips">{employee.roleAssignments.filter((item) => item.active).map((item) => <span key={item.roleKey}>{ROLE_TEMPLATES[item.roleKey].shortLabelAr}</span>)}</div><small>الفرع الأساسي: {branchNames[employee.primaryBranchId] ?? employee.primaryBranchId}</small><Link className="ui-button ui-button--primary ui-button--sm" href={`/employees/${employee.id}`}>عرض الملف</Link></Card>; }
