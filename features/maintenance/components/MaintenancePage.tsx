"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, MapPin, Plus, Wrench, Warehouse } from "lucide-react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useMaintenance } from "../hooks/use-maintenance";
import { canIntakeMaintenance, canStartWorkshopPickup, canViewMaintenance, isMaintenanceAdmin } from "../permissions";
import { dateTime, priorityLabels, statusLabels, statusTone, subjectLabels } from "./maintenance-labels";

export function MaintenancePage() {
  const { roles, activeBranch, availableBranches } = useShell();
  const { faults, orders } = useMaintenance();
  const branches = useBranches(); const customers = useCustomers();
  if (!canViewMaintenance(roles)) return <PermissionDeniedState />;
  if (roles.includes("maintenance_technician") && !isMaintenanceAdmin(roles) && !canIntakeMaintenance(roles)) return <MaintenanceFaultsPage />;
  const allowed = new Set(availableBranches.filter((item) => item.id !== "all").map((item) => item.id));
  const scoped = orders.filter((order) => activeBranch.id === "all" ? (isMaintenanceAdmin(roles) || allowed.has(order.branchId)) : order.branchId === activeBranch.id);
  const branchMap = new Map(branches.map((item) => [item.id, item.name]));
  const customerMap = new Map(customers.map((item) => [item.id, item.name]));
  const faultMap = new Map(faults.map((item) => [item.id, item]));
  return <div className="maintenance-page">
    <header className="maintenance-page__header"><div><span>التشغيل</span><h2>الصيانة وبلاغات الأعطال</h2><p>متابعة موحدة لأصول التأجير ولعب العملاء من الاستلام حتى التسليم.</p></div><div className="maintenance-actions">{canIntakeMaintenance(roles) ? <><Link className="ui-button ui-button--primary ui-button--md" href="/maintenance/intake?type=internal_asset"><Wrench size={18}/>بلاغ عطل</Link><Link className="ui-button ui-button--secondary ui-button--md" href="/maintenance/intake?type=customer_item"><Plus size={18}/>استلام لعبة</Link></> : null}<Link className="ui-button ui-button--secondary ui-button--md" href="/maintenance/faults"><Wrench size={18}/>صندوق البلاغات</Link>{isMaintenanceAdmin(roles) ? <Link className="ui-button ui-button--secondary ui-button--md" href="/maintenance/workshop"><Warehouse size={18}/>الورشة المركزية</Link> : null}</div></header>
    <section className="maintenance-summary" aria-label="ملخص الصيانة">
      <Card><span>البلاغات المفتوحة</span><strong>{faults.filter((item)=>!["closed","cancelled"].includes(item.status)).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
      <Card><span>بانتظار فني</span><strong>{orders.filter((item)=>item.status==="awaiting_acknowledgement").length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
      <Card><span>بانتظار موافقة</span><strong>{orders.filter((item)=>item.status==="awaiting_customer_approval").length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
      <Card><span>جاهزة للتسليم/العودة</span><strong>{orders.filter((item)=>["ready_for_delivery","ready_for_return"].includes(item.status)).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
    </section>
    <Card className="maintenance-list"><div className="maintenance-table-wrap"><table><thead><tr><th>الأمر</th><th>النوع واللعبة</th><th>الفرع/الموقع</th><th>العميل</th><th>الأولوية</th><th>الحالة</th><th>آخر تحديث</th><th></th></tr></thead><tbody>{scoped.map((order)=>{const fault=faultMap.get(order.faultReportId);return <tr key={order.id}><td><strong>{order.orderNumber}</strong></td><td>{subjectLabels[order.subjectType]}<small>{fault?.itemName}</small></td><td>{branchMap.get(order.branchId)??order.branchId}<small>{order.currentLocation==="workshop"?"الورشة المركزية":order.currentLocation}</small></td><td>{order.customerId?customerMap.get(order.customerId):"داخلي"}</td><td><Badge tone={fault?.priority==="urgent"?"danger":"neutral"}>{fault?priorityLabels[fault.priority]:"—"}</Badge></td><td><Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge></td><td>{dateTime(order.updatedAt)}</td><td><Link href={`/maintenance/orders/${order.id}`}>عرض</Link></td></tr>})}</tbody></table></div>
      <div className="maintenance-mobile-list">{scoped.map((order)=>{const fault=faultMap.get(order.faultReportId);return <Link href={`/maintenance/orders/${order.id}`} key={order.id} className="maintenance-mobile-card"><header><strong>{order.orderNumber}</strong><Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge></header><h3>{fault?.itemName}</h3><p>{branchMap.get(order.branchId)} · {subjectLabels[order.subjectType]}</p></Link>})}</div>
    </Card>
  </div>;
}

export function MaintenanceFaultsPage() {
  const { roles } = useShell();
  const { faults, orders } = useMaintenance();
  const branches = useBranches();
  const [branchFilter, setBranchFilter] = useState("all");

  if (!canViewMaintenance(roles) || (roles.includes("rental_maintenance_employee") && !isMaintenanceAdmin(roles) && !roles.includes("maintenance_technician"))) {
    return <PermissionDeniedState />;
  }

  const techOnly = roles.includes("maintenance_technician") && !isMaintenanceAdmin(roles);
  const eligible = techOnly
    ? faults.filter((item) => !item.assignedTechnicianId || item.assignedTechnicianId === "employee-technician")
    : faults;
  const eligibleBranchIds = new Set(eligible.map((item) => item.branchId));
  const branchOptions = branches.filter((item) => eligibleBranchIds.has(item.id));
  const visible = branchFilter === "all" ? eligible : eligible.filter((item) => item.branchId === branchFilter);
  const branchMap = new Map(branches.map((item) => [item.id, item.name]));
  const orderMap = new Map(orders.map((item) => [item.faultReportId, item]));

  return <div className="maintenance-page">
    <header className="maintenance-page__header">
      <div><span>الصيانة</span><h2>صندوق بلاغات الأعطال</h2><p>تفاصيل الفرع والموظف واللعبة متاحة للفني المؤهل قبل تأكيد الاستلام.</p></div>
    </header>

    {techOnly ? <Card className="maintenance-fault-filters">
      <div>
        <strong>فلترة صيانة الفروع</strong>
        <span>اختر الفرع الذي تريد عرض بلاغاته المؤهلة لك.</span>
      </div>
      <label htmlFor="technician-branch-filter">
        <span>الفرع</span>
        <select id="technician-branch-filter" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
          <option value="all">كل الفروع</option>
          {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </label>
      <p><strong>{visible.length.toLocaleString("en-US")}</strong> من {eligible.length.toLocaleString("en-US")} بلاغ</p>
    </Card> : null}

    <div className="fault-grid">
      {visible.map((fault) => {
        const order = orderMap.get(fault.id);
        const canStartPickup = techOnly && canStartWorkshopPickup(order, "employee-technician");
        return <Card key={fault.id} className="fault-card">
          <header><Badge tone={fault.priority === "urgent" ? "danger" : "warning"}>{priorityLabels[fault.priority]}</Badge><strong>{fault.faultNumber}</strong></header>
          <h3>{fault.itemName}</h3>
          <p>{fault.faultDescription}</p>
          <dl>
            <div><dt>الفرع</dt><dd>{branchMap.get(fault.branchId) ?? fault.branchId}</dd></div>
            <div><dt>الموقع الحالي</dt><dd>{fault.currentLocation === "workshop" ? "الورشة المركزية" : branchMap.get(fault.currentLocation) ?? fault.currentLocation}</dd></div>
            <div><dt>النوع</dt><dd>{subjectLabels[fault.subjectType]}</dd></div>
            <div><dt>الحالة</dt><dd>{order ? statusLabels[order.status] : fault.status}</dd></div>
          </dl>
          <div className="fault-card__actions">
            {canStartPickup && order ? <Link className="ui-button ui-button--secondary ui-button--md" href={`/maintenance/orders/${order.id}`}><MapPin size={17} />صيانة في الفرع</Link> : null}
            {canStartPickup && order ? <Link className="ui-button ui-button--primary ui-button--md" href={`/inventory/transfers/new?type=maintenance_to_workshop&orderId=${order.id}`}><ArrowLeftRight size={17} />استلام وتحويل للورشة</Link> : null}
            <Link className="ui-button ui-button--secondary ui-button--md fault-card__details" href={"/maintenance/faults/" + fault.id}>فتح البلاغ</Link>
          </div>
        </Card>;
      })}
      {!visible.length ? <Card className="maintenance-state maintenance-fault-empty">
        <h3>لا توجد بلاغات لهذا الفرع</h3>
        <p>اختر فرعًا آخر أو اعرض كل الفروع.</p>
      </Card> : null}
    </div>
  </div>;
}
