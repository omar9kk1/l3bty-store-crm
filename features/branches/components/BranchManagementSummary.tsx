"use client";

import { CalendarDays, UserRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import type { Branch } from "../types";

export function BranchManagementSummary({ branch }: { branch: Branch }) {
  const manager = useEmployees().find((item) => item.id === branch.managerEmployeeId)?.name ?? "غير محدد";
  return <Card className="branch-detail-card">
    <div className="branch-detail-card__heading"><div><span>الإدارة</span><h3>إدارة الموقع</h3></div><UserRound aria-hidden size={20} /></div>
    <dl className="branch-detail-list">
      <div><dt>مدير الموقع</dt><dd>{manager}</dd></div>
      <div><dt>تاريخ الإنشاء</dt><dd><CalendarDays aria-hidden size={14} />{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeZone: branch.timezone }).format(new Date(branch.createdAt))}</dd></div>
      <div><dt>آخر تحديث</dt><dd>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeZone: branch.timezone }).format(new Date(branch.updatedAt))}</dd></div>
    </dl>
    {branch.notes ? <p className="branch-notes">{branch.notes}</p> : null}
  </Card>;
}
