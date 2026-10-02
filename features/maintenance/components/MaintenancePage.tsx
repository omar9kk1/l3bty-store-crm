"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftRight, MapPin, Plus, Trash2, Wrench, Warehouse } from "lucide-react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { CustomerDeleteDrawer } from "@/features/customers/components/CustomerDeleteDrawer";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { resolveCustomerAccess } from "@/features/customers/permissions";
import type { Customer } from "@/features/customers/types";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useRentals } from "@/features/rentals/hooks/use-rentals";
import { useMaintenance } from "../hooks/use-maintenance";
import { acknowledgeFault, adoptLegacyPreviewTechnicianAssignments, deleteMaintenanceFault } from "../services/maintenance-store";
import { canIntakeMaintenance, canManageMaintenance, canStartWorkshopPickup, canViewMaintenance, isMaintenanceAdmin } from "../permissions";
import type { MaintenanceOrder, MaintenanceStatus } from "../types";
import { money, priorityLabels, statusLabels, statusTone, subjectLabels } from "./maintenance-labels";

const inspectionStatuses = new Set<MaintenanceStatus>(["acknowledged", "inspection_scheduled", "diagnosing"]);
const repairStatuses = new Set<MaintenanceStatus>(["awaiting_customer_approval", "awaiting_part", "transfer_requested", "in_transit_to_workshop", "received_at_workshop", "in_repair", "quality_check"]);
const readyStatuses = new Set<MaintenanceStatus>(["ready_for_return", "returning_to_branch", "ready_for_delivery"]);
const completedStatuses = new Set<MaintenanceStatus>(["delivered", "closed", "cancelled"]);

function maintenanceCost(order: MaintenanceOrder) {
  return order.finalTotal || order.approvedEstimate || order.estimatedTotal;
}

function maintenanceDuration(order: MaintenanceOrder) {
  const end = completedStatuses.has(order.status) ? new Date(order.updatedAt).getTime() : Date.now();
  const hours = Math.max(1, Math.floor((end - new Date(order.createdAt).getTime()) / 3_600_000));
  return hours < 24 ? `${hours.toLocaleString("ar-EG-u-nu-latn")} س` : `${Math.floor(hours / 24).toLocaleString("ar-EG-u-nu-latn")} يوم`;
}

export function MaintenancePage() {
  const { roles, activeEmployee, activeBranch, availableBranches } = useShell();
  const [deletingCustomer, setDeletingCustomer] = useState<Customer>();
  const [notice, setNotice] = useState("");
  const { faults, orders } = useMaintenance();
  const branches = useBranches(); const customers = useCustomers(); const employees = useEmployees(); const { assets } = useRentals();
  if (!canViewMaintenance(roles)) return <PermissionDeniedState />;
  if (roles.includes("maintenance_technician") && !isMaintenanceAdmin(roles) && !canIntakeMaintenance(roles)) return <MaintenanceFaultsPage />;
  const allowed = new Set(availableBranches.filter((item) => item.id !== "all").map((item) => item.id));
  const scoped = orders.filter((order) => activeBranch.id === "all" ? (isMaintenanceAdmin(roles) || allowed.has(order.branchId)) : order.branchId === activeBranch.id);
  const visibleOrders = scoped.filter((order) => !completedStatuses.has(order.status));
  const branchMap = new Map(branches.map((item) => [item.id, item.name]));
  const customerMap = new Map(customers.map((item) => [item.id, item.name]));
  const employeeMap = new Map(employees.map((item) => [item.id, item.name]));
  const assetMap = new Map(assets.map((item) => [item.id, item]));
  const faultMap = new Map(faults.map((item) => [item.id, item]));
  const manager = canManageMaintenance(roles);
  const ownerReadOnly = roles.includes("owner") && !manager;
  const intake = canIntakeMaintenance(roles);
  const customerAccess = resolveCustomerAccess(roles);
  return <div className="maintenance-page">
    <header className="maintenance-page__header"><div><span>{ownerReadOnly || manager ? "الإدارة" : "التشغيل"}</span><h2>{ownerReadOnly ? "متابعة الصيانة" : manager ? "إدارة الصيانة" : "الصيانة وبلاغات الأعطال"}</h2><p>{ownerReadOnly ? "تابع الألعاب المتوقفة وحالتها وتكلفتها دون إجراءات تشغيلية." : manager ? "تابع الحالات، عيّن الفنيين، وراجع الصيانة حتى عودة اللعبة للخدمة." : "سجّل البلاغ أو استلام لعبة العميل وتابعها حتى التسليم."}</p></div><div className="maintenance-actions">{intake ? <><Link className="ui-button ui-button--primary ui-button--md" href="/maintenance/intake?type=internal_asset"><Wrench size={18}/>بلاغ عطل</Link><Link className="ui-button ui-button--secondary ui-button--md" href="/maintenance/intake?type=customer_item"><Plus size={18}/>استلام لعبة</Link></> : null}{manager ? <><Link className="ui-button ui-button--secondary ui-button--md" href="/maintenance/faults"><Wrench size={18}/>صندوق البلاغات</Link><Link className="ui-button ui-button--secondary ui-button--md" href="/maintenance/workshop"><Warehouse size={18}/>الورشة المركزية</Link></> : null}</div></header>
    <section className="maintenance-summary" aria-label="ملخص الصيانة">
      <Card><span>بلاغات جديدة</span><strong>{visibleOrders.filter((item)=>["new","awaiting_acknowledgement"].includes(item.status)).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
      <Card><span>قيد الفحص</span><strong>{visibleOrders.filter((item)=>inspectionStatuses.has(item.status)).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
      <Card><span>تحت الصيانة</span><strong>{visibleOrders.filter((item)=>repairStatuses.has(item.status)).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
      <Card><span>جاهزة للعودة</span><strong>{visibleOrders.filter((item)=>readyStatuses.has(item.status)).length.toLocaleString("ar-EG-u-nu-latn")}</strong></Card>
    </section>
    {notice ? <div className="maintenance-feedback" role="status">{notice}</div> : null}
    <CustomerDeleteDrawer key={deletingCustomer?.id ?? "closed"} customer={deletingCustomer} roles={roles} employee={activeEmployee} branchId={activeBranch.id} onClose={() => setDeletingCustomer(undefined)} onDone={(message) => { setDeletingCustomer(undefined); setNotice(message); }} />
    {visibleOrders.length ? <Card className="maintenance-list"><div className="maintenance-table-wrap"><table><thead><tr><th>اللعبة</th><th>العطل</th><th>الفرع</th><th>الفني</th><th>مدة التوقف</th><th>التكلفة</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{visibleOrders.map((order)=>{const fault=faultMap.get(order.faultReportId);const asset=order.rentalAssetId?assetMap.get(order.rentalAssetId):undefined;const customer=order.customerId?customers.find((item)=>item.id===order.customerId&&!item.deletedAt):undefined;return <tr key={order.id}><td><strong>{fault?.itemName??order.orderNumber}</strong><small>{asset?<>رقم اللعبة: <bdi dir="ltr">{asset.barcode}</bdi></>:order.customerId?<>العميل: {customerMap.get(order.customerId)??"غير متاح"}</>:subjectLabels[order.subjectType]}</small></td><td>{fault?.faultDescription??"—"}</td><td>{branchMap.get(order.branchId)??"فرع غير معروف"}<small>{order.currentLocation==="workshop"?"الورشة المركزية":branchMap.get(order.currentLocation)??"موقع غير معروف"}</small></td><td>{order.assignedTechnicianId?employeeMap.get(order.assignedTechnicianId)??"غير معروف":"غير مسند"}</td><td>{maintenanceDuration(order)}</td><td>{money(maintenanceCost(order))}</td><td><Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge></td><td><div className="maintenance-row-actions"><Link href={`/maintenance/orders/${order.id}`}>التفاصيل</Link>{customer&&(customerAccess.canRequestDelete||customerAccess.canDeleteDirectly)?<Button size="sm" variant="ghost" icon={<Trash2 aria-hidden size={14}/>} onClick={()=>setDeletingCustomer(customer)}>{customerAccess.canDeleteDirectly?"حذف العميل":"طلب حذف العميل"}</Button>:null}</div></td></tr>})}</tbody></table></div>
      <div className="maintenance-mobile-list">{visibleOrders.map((order)=>{const fault=faultMap.get(order.faultReportId);const asset=order.rentalAssetId?assetMap.get(order.rentalAssetId):undefined;const customer=order.customerId?customers.find((item)=>item.id===order.customerId&&!item.deletedAt):undefined;return <div className="maintenance-mobile-entry" key={order.id}><Link href={`/maintenance/orders/${order.id}`} className="maintenance-mobile-card"><header><strong>{fault?.itemName??order.orderNumber}</strong><Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge></header><p>{asset?<>رقم اللعبة: <bdi dir="ltr">{asset.barcode}</bdi></>:subjectLabels[order.subjectType]} · {branchMap.get(order.branchId)??"فرع غير معروف"}</p><p>الفني: {order.assignedTechnicianId?employeeMap.get(order.assignedTechnicianId)??"غير معروف":"غير مسند"} · {maintenanceDuration(order)} · {money(maintenanceCost(order))}</p></Link>{customer&&(customerAccess.canRequestDelete||customerAccess.canDeleteDirectly)?<Button className="maintenance-mobile-delete" size="sm" variant="ghost" icon={<Trash2 aria-hidden size={14}/>} onClick={()=>setDeletingCustomer(customer)}>{customerAccess.canDeleteDirectly?"حذف العميل":"طلب حذف العميل"}</Button>:null}</div>})}</div>
    </Card> : <Card className="maintenance-state"><h3>لا توجد حالات صيانة نشطة</h3><p>ستظهر هنا الألعاب فور تسجيل بلاغ أو استلامها للصيانة.</p></Card>}
  </div>;
}

export function MaintenanceFaultsPage() {
  const { roles, activeEmployee } = useShell();
  const router = useRouter();
  const { faults, orders } = useMaintenance();
  const branches = useBranches();
  const [branchFilter, setBranchFilter] = useState("all");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (roles.includes("maintenance_technician") && activeEmployee) adoptLegacyPreviewTechnicianAssignments(activeEmployee.id);
  }, [activeEmployee, roles]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!canViewMaintenance(roles) || (roles.includes("rental_maintenance_employee") && !isMaintenanceAdmin(roles) && !roles.includes("maintenance_technician"))) {
    return <PermissionDeniedState />;
  }

  const techOnly = roles.includes("maintenance_technician") && !isMaintenanceAdmin(roles);
  const technicianId = activeEmployee?.id ?? "";
  const eligible = techOnly
    ? faults.filter((item) => !item.assignedTechnicianId || item.assignedTechnicianId === technicianId)
    : faults;
  const eligibleBranchIds = new Set(eligible.map((item) => item.branchId));
  const branchOptions = branches.filter((item) => eligibleBranchIds.has(item.id));
  const visible = branchFilter === "all" ? eligible : eligible.filter((item) => item.branchId === branchFilter);
  const branchMap = new Map(branches.map((item) => [item.id, item.name]));
  const orderMap = new Map(orders.map((item) => [item.faultReportId, item]));
  const manager = canManageMaintenance(roles);

  function startMaintenance(faultId:string, order:MaintenanceOrder|undefined, destination:"branch"|"workshop") {
    if (!activeEmployee || !order) { setNotice("اختر فني الصيانة أولًا."); return; }
    const fault = faults.find((item)=>item.id===faultId);
    if (!fault) return;
    if (!fault.acknowledgedAt) {
      const result = acknowledgeFault(faultId, activeEmployee.id);
      if (!result.valid) { setNotice(result.message); return; }
    }
    router.push(destination==="branch"?`/maintenance/orders/${order.id}`:`/inventory/transfers/new?type=maintenance_to_workshop&orderId=${order.id}`);
  }

  return <div className="maintenance-page">
    <header className="maintenance-page__header">
      <div><span>الصيانة</span><h2>صندوق بلاغات الأعطال</h2><p>تفاصيل الفرع والموظف واللعبة متاحة للفني المؤهل قبل تأكيد الاستلام.</p></div>
    </header>

    {notice ? <div className="maintenance-feedback" role="status">{notice}</div> : null}

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
        const canChoosePath = techOnly && Boolean(order) && Boolean(activeEmployee) && (!fault.assignedTechnicianId || fault.assignedTechnicianId===technicianId);
        const canStartPickup = canChoosePath && (canStartWorkshopPickup(order, technicianId) || !fault.acknowledgedAt);
        return <Card key={fault.id} className="fault-card">
          <header><Badge tone={fault.priority === "urgent" ? "danger" : "warning"}>{priorityLabels[fault.priority]}</Badge><strong>{fault.faultNumber}</strong></header>
          <h3>{fault.itemName}</h3>
          <p>{fault.faultDescription}</p>
          <dl>
            <div><dt>الفرع</dt><dd>{branchMap.get(fault.branchId) ?? "فرع غير معروف"}</dd></div>
            <div><dt>الموقع الحالي</dt><dd>{fault.currentLocation === "workshop" ? "الورشة المركزية" : branchMap.get(fault.currentLocation) ?? "موقع غير معروف"}</dd></div>
            <div><dt>النوع</dt><dd>{subjectLabels[fault.subjectType]}</dd></div>
            <div><dt>الحالة</dt><dd>{order ? statusLabels[order.status] : "بانتظار إنشاء أمر الصيانة"}</dd></div>
          </dl>
          <div className="fault-card__actions">
            {canStartPickup && order ? <Button type="button" variant="secondary" onClick={()=>startMaintenance(fault.id,order,"branch")}><MapPin size={17} />صيانة في الفرع</Button> : null}
            {canStartPickup && order ? <Button type="button" variant="primary" onClick={()=>startMaintenance(fault.id,order,"workshop")}><ArrowLeftRight size={17} />استلام وتحويل للورشة</Button> : null}
            <div className="fault-card__footer">
              <Link className="ui-button ui-button--secondary ui-button--md fault-card__details" href={"/maintenance/faults/" + fault.id}>فتح البلاغ</Link>
              {manager ? <Button type="button" size="sm" variant="ghost" className="fault-card__delete" icon={<Trash2 aria-hidden size={16}/>} aria-label={`حذف البلاغ ${fault.faultNumber}`} title="حذف البلاغ" onClick={()=>{if(!window.confirm(`هل تريد حذف البلاغ ${fault.faultNumber}؟`))return;const result=deleteMaintenanceFault(fault.id,"manager");setNotice(result.message);}}/> : null}
            </div>
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
