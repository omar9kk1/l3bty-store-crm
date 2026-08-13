import Link from "next/link";
import { Building2, MapPin, Pencil, RadioTower, UserRound, Warehouse, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BRANCH_MANAGER_FIXTURES } from "../fixtures";
import type { Branch, BranchAccess } from "../types";
import { branchStatusLabels, branchStatusTones, branchTypeLabels } from "./branch-labels";

export function BranchCard({ branch, access, active, offline, onEdit, onUse }: { branch: Branch; access: BranchAccess; active: boolean; offline: boolean; onEdit: () => void; onUse: () => void }) {
  const manager = BRANCH_MANAGER_FIXTURES.find((item) => item.id === branch.managerEmployeeId)?.name ?? "غير محدد";

  return (
    <Card className="branch-card" data-branch-card={branch.id}>
      <div className="branch-card__heading">
        <span className="branch-card__icon">{branch.type === "central_workshop" ? <Wrench aria-hidden /> : <Building2 aria-hidden />}</span>
        <div>
          <div className="branch-card__badges">
            <Badge tone={branchStatusTones[branch.status]}>{branchStatusLabels[branch.status]}</Badge>
            <Badge>{branchTypeLabels[branch.type]}</Badge>
            {active ? <Badge tone="accent">النطاق الحالي</Badge> : null}
          </div>
          <h3>{branch.name}</h3>
          <span className="branch-code">{branch.code}</span>
        </div>
      </div>
      <p className="branch-card__address"><MapPin aria-hidden size={16} />{branch.address}، {branch.area}، {branch.city}</p>
      {access.canManage ? <div className="branch-card__manager"><UserRound aria-hidden size={16} /><span>المسؤول: {manager}</span></div> : null}
      <dl className="branch-card__stats">
        {access.canViewEmployees ? <div><dt><UserRound aria-hidden size={14} />الموظفون</dt><dd>{branch.assignedEmployeeCount}</dd></div> : null}
        {access.canViewWarehouses ? <div><dt><Warehouse aria-hidden size={14} />المخازن</dt><dd>{branch.warehouseCount}</dd></div> : null}
        {access.canViewCashboxes && branch.type === "branch" ? <div><dt>الخزائن</dt><dd>{branch.cashboxCount}</dd></div> : null}
        {access.canViewShifts ? <div><dt><RadioTower aria-hidden size={14} />ورديات مفتوحة</dt><dd>{branch.openShiftCount}</dd></div> : null}
        {access.canViewMaintenance ? <div><dt><Wrench aria-hidden size={14} />صيانة مفتوحة</dt><dd>{branch.openMaintenanceOrderCount}</dd></div> : null}
      </dl>
      <div className="branch-card__updated">آخر تحديث {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeZone: branch.timezone }).format(new Date(branch.updatedAt))}</div>
      <div className="branch-card__actions">
        <Link className="ui-button ui-button--primary ui-button--sm" href={`/branches/${branch.id}`}>عرض الملف</Link>
        <Button type="button" size="sm" onClick={onUse} disabled={active || branch.status === "inactive"}>استخدام هذا الفرع</Button>
        {access.canManage ? <Button type="button" size="sm" variant="ghost" icon={<Pencil aria-hidden size={15} />} onClick={onEdit} disabled={offline}>تعديل</Button> : null}
      </div>
    </Card>
  );
}
