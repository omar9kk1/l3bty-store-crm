"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { useProducts } from "@/features/products/hooks/use-products";
import { useMaintenance } from "../hooks/use-maintenance";
import { canAccessMaintenanceBranch, canManageMaintenance, canManageWorkshop, canSendMaintenanceWhatsApp, canStartWorkshopPickup, canViewMaintenance, canWorkMaintenance, isMaintenanceAdmin } from "../permissions";
import { acknowledgeFault, issuePart, reassignTechnician, requestPart, saveDiagnosis, setCustomerApproval, updateMaintenanceStatus } from "../services/maintenance-store";
import { buildMaintenanceWhatsAppUrl, type MaintenanceWhatsAppKind } from "../services/maintenance-whatsapp-service";
import type { MaintenanceStatus } from "../types";
import { dateTime, money, priorityLabels, statusLabels, statusTone, subjectLabels } from "./maintenance-labels";

const fallbackTechnicianId="employee-technician"; const fallbackAdminActor="employee-manager";

const approvalStatusLabels: Record<string, string> = {
  pending: "بانتظار موافقة العميل",
  approved: "وافق العميل",
  rejected: "رفض العميل",
  not_required: "لا تحتاج موافقة",
};

const partUsageStatusLabels: Record<string, string> = {
  requested: "مطلوبة",
  approved: "معتمدة",
  partially_issued: "صُرف جزء منها",
  issued: "تم صرفها",
  rejected: "مرفوضة",
};

const transferStatusLabels: Record<string, string> = {
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمدة",
  in_transit: "في الطريق",
  received: "تم الاستلام",
  completed: "مكتملة",
  rejected: "مرفوضة",
};

const eventTypeLabels: Record<string, string> = {
  created: "إنشاء أمر الصيانة",
  acknowledged: "تأكيد استلام البلاغ",
  assigned: "تعيين الفني",
  reassigned: "إعادة تعيين الفني",
  diagnosis_saved: "حفظ التشخيص",
  customer_approval_updated: "تحديث موافقة العميل",
  status_updated: "تحديث حالة الصيانة",
  part_requested: "طلب قطعة غيار",
  part_issued: "صرف قطعة غيار",
  workshop_transfer_created: "إنشاء تحويل للورشة",
};

function useAutoDismissMessage(timeoutMs = 10_000) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => setMessage(""), timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [message, timeoutMs]);

  return [message, setMessage] as const;
}

export function FaultDetailsPage({faultId}:{faultId:string}){
  const {roles,activeEmployee}=useShell();const {faults,orders}=useMaintenance();const branches=useBranches();const employees=useEmployees();const [message,setMessage]=useAutoDismissMessage();const [reassignOpen,setReassignOpen]=useState(false);const currentTechnicianId=activeEmployee?.id??fallbackTechnicianId;const actorId=activeEmployee?.id??fallbackAdminActor;
  if(!canViewMaintenance(roles)||(roles.includes("rental_maintenance_employee")&&!isMaintenanceAdmin(roles)&&!roles.includes("maintenance_technician")))return <PermissionDeniedState/>;
  const fault=faults.find((item)=>item.id===faultId);if(!fault)return <Card className="maintenance-state"><h2>البلاغ غير موجود</h2><Link href="/maintenance/faults">العودة للبلاغات</Link></Card>;
  const currentFault=fault;const order=orders.find((item)=>item.faultReportId===currentFault.id);const branch=branches.find((item)=>item.id===currentFault.branchId);const reporter=employees.find((item)=>item.id===currentFault.reportedByEmployeeId);const technician=employees.find((item)=>item.id===currentFault.assignedTechnicianId);const canAck=roles.includes("maintenance_technician")&&!currentFault.acknowledgedAt&&(!currentFault.assignedTechnicianId||currentFault.assignedTechnicianId===currentTechnicianId);
  function acknowledge(){const result=acknowledgeFault(currentFault.id,currentTechnicianId);setMessage(result.message);}
  function reassign(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!order)return;const data=new FormData(event.currentTarget);const result=reassignTechnician(order.id,String(data.get("technicianId")),actorId,String(data.get("reason")));setMessage(result.message);if(result.valid)setReassignOpen(false);}
  return <div className="maintenance-page"><header className="maintenance-page__header"><div><span>بلاغ عطل</span><h2>{fault.faultNumber}</h2><p>{fault.itemName}</p></div><div className="maintenance-actions">{canAck?<Button variant="primary" onClick={acknowledge}>تأكيد استلام البلاغ</Button>:null}{canManageMaintenance(roles)&&order?<Button onClick={()=>setReassignOpen(true)}>تعيين/إعادة تعيين</Button>:null}{order?<Link className="ui-button ui-button--secondary ui-button--md" href={`/maintenance/orders/${order.id}`}>فتح أمر الصيانة</Link>:null}</div></header>{message?<p className="maintenance-feedback" role="status">{message}</p>:null}<div className="maintenance-details-grid"><Card><h3>تفاصيل البلاغ</h3><dl className="maintenance-dl"><div><dt>النوع</dt><dd>{subjectLabels[fault.subjectType]}</dd></div><div><dt>الأولوية</dt><dd><Badge tone={fault.priority==="urgent"?"danger":"warning"}>{priorityLabels[fault.priority]}</Badge></dd></div><div><dt>الفرع</dt><dd>{branch?.name??"فرع غير معروف"}</dd></div><div><dt>المبلّغ</dt><dd>{reporter?.name??"موظف غير معروف"}</dd></div><div><dt>الفني</dt><dd>{technician?.name??"غير مسند"}</dd></div><div><dt>وقت البلاغ</dt><dd>{dateTime(fault.reportedAt)}</dd></div><div><dt>الموقع الحالي</dt><dd>{fault.currentLocation==="workshop"?"الورشة المركزية":"موقع غير معروف"}</dd></div><div><dt>توقف التشغيل</dt><dd>{fault.stoppedOperating?"نعم":"لا"}</dd></div></dl></Card><Card><h3>العطل والحالة المستلمة</h3><p>{fault.faultDescription}</p><h4>الحالة الخارجية</h4><p>{fault.intakeCondition}</p><h4>الملحقات</h4><p>{fault.accessories.join("، ")||"لا توجد"}</p><h4>المرفقات</h4><ul>{fault.evidenceAttachments.map((item)=><li key={item.id}>{item.name}</li>)}</ul></Card></div><Drawer open={reassignOpen} onOpenChange={setReassignOpen} title="تعيين فني مسؤول" description="سبب إعادة التعيين مطلوب ويظهر في سجل النشاط." variant="auxiliary"><form className="maintenance-form" onSubmit={reassign}><label>الفني<select name="technicianId" required>{employees.filter((item)=>item.status==="active"&&item.roleAssignments.some((role)=>role.roleKey==="maintenance_technician")).map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>السبب<textarea name="reason" required/></label><Button variant="primary" type="submit">حفظ التعيين</Button></form></Drawer></div>;
}

function WhatsAppAction({phone,kind,reference,item,amount=0}:{phone:string;kind:MaintenanceWhatsAppKind;reference:string;item:string;amount?:number}){const url=buildMaintenanceWhatsAppUrl(phone,kind,reference,item,amount);return url?<a className="ui-button ui-button--secondary ui-button--sm" href={url} target="_blank" rel="noreferrer">فتح WhatsApp يدويًا</a>:<Button size="sm" disabled>رقم WhatsApp غير صالح</Button>}

export function MaintenanceOrderDetailsPage({orderId}:{orderId:string}){
  const {roles,activeEmployee,activeBranch,availableBranches}=useShell();const {orders,faults}=useMaintenance();const customers=useCustomers();const employees=useEmployees();const {products}=useProducts();const [message,setMessage]=useAutoDismissMessage();const [panel,setPanel]=useState<"diagnosis"|"part"|null>(null);const currentTechnicianId=activeEmployee?.id??fallbackTechnicianId;const actorId=activeEmployee?.id??fallbackAdminActor;
  const technicianId=currentTechnicianId;const adminActor=actorId;
  if(!canViewMaintenance(roles))return <PermissionDeniedState/>;const order=orders.find((item)=>item.id===orderId);if(!order)return <Card className="maintenance-state"><h2>أمر الصيانة غير موجود</h2><Link href="/maintenance">العودة</Link></Card>;const assignedBranches=availableBranches.filter((item)=>item.id!=="all").map((item)=>item.id);if(!canAccessMaintenanceBranch(roles,order.branchId,assignedBranches))return <PermissionDeniedState/>;const currentOrder=order;const fault=faults.find((item)=>item.id===currentOrder.faultReportId)!;const customer=customers.find((item)=>item.id===currentOrder.customerId);const technician=employees.find((item)=>item.id===currentOrder.assignedTechnicianId);const canWork=canWorkMaintenance(roles)&&(isMaintenanceAdmin(roles)||currentOrder.assignedTechnicianId===currentTechnicianId);const canCustomer=canSendMaintenanceWhatsApp(roles)&&currentOrder.subjectType==="customer_item";const canRentalHandover=roles.includes("rental_maintenance_employee")&&!isMaintenanceAdmin(roles)&&!roles.includes("maintenance_technician")&&currentOrder.branchId===activeBranch.id&&canStartWorkshopPickup(currentOrder,currentOrder.assignedTechnicianId??"");
  function feedback(result:{valid:boolean;message:string}){setMessage(result.message);if(result.valid)setPanel(null);}
  function diagnosis(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);feedback(saveDiagnosis({orderId:currentOrder.id,technicianId:currentOrder.assignedTechnicianId??currentTechnicianId,diagnosis:String(data.get("diagnosis")),faultCause:String(data.get("faultCause")),recommendedAction:String(data.get("recommendedAction")),labourEstimate:currentOrder.labourEstimate,expectedCompletionAt:currentOrder.expectedCompletionAt??"",labourWarrantyDays:currentOrder.labourWarrantyDays,partsWarrantyDays:currentOrder.partsWarrantyDays,needsWorkshop:false,notes:currentOrder.technicianNotes}));}
  function part(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);feedback(requestPart(currentOrder.id,String(data.get("productId")),Number(data.get("quantity")),currentOrder.assignedTechnicianId??currentTechnicianId,String(data.get("note"))));}
  const nextStatuses:MaintenanceStatus[]=["in_repair","quality_check",order.subjectType==="customer_item"?"ready_for_delivery":"closed",order.subjectType==="customer_item"?"delivered":"closed","closed"];
  return <div className="maintenance-page"><header className="maintenance-page__header"><div><span>أمر صيانة</span><h2>{order.orderNumber}</h2><p>{fault.itemName} · {subjectLabels[order.subjectType]}</p></div><div className="maintenance-actions">{canWork?<Button onClick={()=>setPanel("part")}>طلب قطعة</Button>:null}{canRentalHandover?<Link className="ui-button ui-button--primary ui-button--md" href={`/inventory/transfers/new?type=maintenance_to_workshop&orderId=${currentOrder.id}`}>تسليم اللعبة للورشة</Link>:null}</div></header>{message?<p className="maintenance-feedback" role="status">{message}</p>:null}<section className="maintenance-order-status"><Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge><span>الموقع: {order.currentLocation==="workshop"?"الورشة المركزية":(availableBranches.find((branch)=>branch.id===order.currentLocation)?.nameAr??"موقع غير معروف")}</span><span>الفني: {technician?.name??"غير مسند"}</span></section>{canWork&&canStartWorkshopPickup(currentOrder,technicianId)?<Card className="maintenance-service-choice"><div><strong>اختر مكان تنفيذ الصيانة</strong><span>يمكن إصلاح اللعبة في الفرع الحالي بدون إنشاء تحويل، أو استلامها ونقلها إلى الورشة المركزية.</span></div><div className="maintenance-actions"><Button variant="secondary" onClick={()=>setPanel("diagnosis")}>صيانة في الفرع</Button><Link className="ui-button ui-button--primary ui-button--md" href={`/inventory/transfers/new?type=maintenance_to_workshop&orderId=${currentOrder.id}`}>استلام وتحويل للورشة</Link></div></Card>:null}{canRentalHandover?<Card className="maintenance-service-choice"><div><strong>تسليم اللعبة للصيانة في الورشة</strong><span>سجّل حالة اللعبة وملحقاتها عند خروجها من فرعك. الفني يؤكد استلامها داخل الورشة.</span></div><Link className="ui-button ui-button--primary ui-button--md" href={`/inventory/transfers/new?type=maintenance_to_workshop&orderId=${currentOrder.id}`}>بدء تسليم اللعبة للورشة</Link></Card>:null}<div className="maintenance-details-grid"><Card><h3>التشخيص والتقدير</h3><dl className="maintenance-dl"><div><dt>التشخيص</dt><dd>{order.diagnosis||"لم يسجل بعد"}</dd></div><div><dt>سبب العطل</dt><dd>{order.faultCause||"—"}</dd></div><div><dt>الإجراء</dt><dd>{order.recommendedAction||"—"}</dd></div><div><dt>تقدير العمل</dt><dd>{money(order.labourEstimate)}</dd></div><div><dt>تقدير القطع</dt><dd>{money(order.partsEstimate)}</dd></div><div><dt>الإجمالي المقدر</dt><dd>{money(order.estimatedTotal)}</dd></div></dl>{canCustomer&&customer?<div className="maintenance-whatsapp"><WhatsAppAction phone={customer.primaryPhone} kind={order.status==="ready_for_delivery"?"ready":"estimate"} reference={order.orderNumber} item={fault.itemName} amount={order.estimatedTotal}/></div>:null}</Card><Card><h3>موافقة العميل والإجراءات</h3>{order.subjectType==="customer_item"?<><p>الحالة: {approvalStatusLabels[order.customerApprovalStatus]??"حالة غير معروفة"}</p>{canCustomer&&order.customerApprovalStatus==="pending"?<div className="maintenance-actions"><Button variant="primary" onClick={()=>feedback(setCustomerApproval(order.id,"approved",adminActor,"موافقة هاتفية موثقة"))}>تسجيل الموافقة</Button><Button variant="danger" onClick={()=>feedback(setCustomerApproval(order.id,"rejected",adminActor,"رفض العميل التقدير"))}>تسجيل الرفض</Button></div>:null}</>:<p>إصلاح داخلي؛ لا توجد موافقة مالية للعميل.</p>}<h4>تحديث الحالة</h4>{canWork?<div className="maintenance-status-actions">{[...new Set(nextStatuses)].map((status)=><Button size="sm" key={status} onClick={()=>feedback(updateMaintenanceStatus(order.id,status,technicianId,"تحديث حالة الصيانة"))}>{statusLabels[status]}</Button>)}</div>:null}</Card><Card><h3>قطع الغيار المرتبطة</h3>{order.partUsages.length?order.partUsages.map((usage)=>{const product=products.find((item)=>item.id===usage.productId);return <div className="maintenance-part" key={usage.id}><strong>{product?.name??"قطعة غير معروفة"}</strong><span>{usage.quantityIssued}/{usage.quantityRequested} · {partUsageStatusLabels[usage.status]??"حالة غير معروفة"}</span>{canWork&&usage.status!=="issued"?<Button size="sm" onClick={()=>feedback(issuePart(order.id,usage.id,usage.quantityRequested-usage.quantityIssued,isMaintenanceAdmin(roles)?adminActor:(currentOrder.assignedTechnicianId??technicianId)))}>تسجيل استخدام القطعة</Button>:null}</div>}):<p>لا توجد قطع مطلوبة.</p>}</Card><Card><h3>التحويل للورشة</h3>{order.workshopTransfer?<><p>{transferStatusLabels[order.workshopTransfer.status]??"حالة غير معروفة"} · {order.workshopTransfer.reason}</p>{canManageWorkshop(roles)?<Link className="ui-button ui-button--secondary ui-button--md" href="/inventory/transfers/new">تسجيل حركة العهدة والتحويل</Link>:null}</>:<p>لا يوجد تحويل.</p>}</Card></div><Card className="maintenance-timeline"><h3>سجل النشاط</h3>{order.events.map((event)=><div key={event.id}><span>{dateTime(event.at)}</span><strong>{eventTypeLabels[event.type]??"تحديث مسجل"}</strong><p>{event.reason}</p></div>)}</Card>
    <Drawer open={panel==="diagnosis"} onOpenChange={(open)=>setPanel(open?"diagnosis":null)} title="تسجيل نتيجة الصيانة في الفرع" description="يملأ الفني هذه البيانات بعد الانتهاء من صيانة اللعبة داخل الفرع." variant="auxiliary"><form className="maintenance-form" onSubmit={diagnosis}><label>التشخيص<textarea name="diagnosis" defaultValue={order.diagnosis} required/></label><label>سبب العطل<textarea name="faultCause" defaultValue={order.faultCause} required/></label><label>الإجراء الذي تم<textarea name="recommendedAction" defaultValue={order.recommendedAction} required/></label><Button type="submit" variant="primary">حفظ نتيجة الصيانة</Button></form></Drawer>
    <Drawer open={panel==="part"} onOpenChange={(open)=>setPanel(open?"part":null)} title="طلب قطعة غيار" description="القطعة مرتبطة بهذا الأمر فقط ولا تمثل إدارة مخزون كاملة." variant="auxiliary"><form className="maintenance-form" onSubmit={part}><label>قطعة الغيار<select name="productId" required>{products.filter((item)=>item.type==="spare_part").map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>الكمية<input type="number" min="1" name="quantity" defaultValue="1"/></label><label>ملاحظة<textarea name="note"/></label><Button type="submit" variant="primary">إنشاء الطلب</Button></form></Drawer>
  </div>;
}

export function WorkshopPage() {
  const { roles } = useShell();
  const { orders, faults } = useMaintenance();
  const branches = useBranches();

  if (!canManageWorkshop(roles)) return <PermissionDeniedState />;

  const relevant = orders.filter((item) => item.workshopTransfer || item.currentLocation === "workshop");
  const faultMap = new Map(faults.map((item) => [item.id, item]));
  const branchNameById = new Map(branches.map((item) => [item.id, item.name]));

  return (
    <div className="maintenance-page">
      <header className="maintenance-page__header">
        <div><span>الصيانة</span><h2>الورشة المركزية</h2><p>الطلبات الواردة ومواقعها الحالية وحالة العودة للفروع.</p></div>
      </header>
      <div className="fault-grid">
        {relevant.map((order) => (
          <Card key={order.id} className="fault-card">
            <header><Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge><strong>{order.orderNumber}</strong></header>
            <h3>{faultMap.get(order.faultReportId)?.itemName}</h3>
            <p>{order.workshopTransfer?.reason}</p>
            <dl>
              <div><dt>من الفرع</dt><dd>{branchNameById.get(order.branchId) ?? "فرع غير معروف"}</dd></div>
              <div><dt>الموقع</dt><dd>{order.currentLocation === "workshop" ? "الورشة المركزية" : (branchNameById.get(order.currentLocation) ?? "موقع غير معروف")}</dd></div>
              <div><dt>التحويل</dt><dd>{order.workshopTransfer ? (transferStatusLabels[order.workshopTransfer.status] ?? "حالة غير معروفة") : "بالورشة"}</dd></div>
            </dl>
            <Link className="ui-button ui-button--secondary ui-button--md" href={`/maintenance/orders/${order.id}`}>فتح الأمر</Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
