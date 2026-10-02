import { EMPLOYEE_FIXTURES } from "@/features/employees/fixtures";
import { getProductSnapshot, commitMaintenancePartStock } from "@/features/products/services/product-store";
import { getRentalSnapshot, setRentalAssetMaintenanceStatus } from "@/features/rentals/services/rental-store";
import { MAINTENANCE_FAULT_FIXTURES, MAINTENANCE_NOTIFICATION_FIXTURES, MAINTENANCE_ORDER_FIXTURES } from "../fixtures";
import { validateMaintenanceIntake } from "../schemas/maintenance-schema";
import type { DiagnosisInput, FaultReport, MaintenanceEvent, MaintenanceIntakeInput, MaintenanceNotification, MaintenanceOrder, MaintenanceStatus, PartUsage, WorkshopTransfer } from "../types";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";
import { getEmployeesSnapshot as getEmployeeRecordsSnapshot } from "@/features/employees/services/employee-store";
import { markNotificationActedByReference, publishNotification } from "@/features/notifications/services/notification-service";
import { repairMaintenanceText } from "./repair-maintenance-text";

const now="2026-08-06T17:30:00+03:00",STORAGE_KEY="l3bty-local-maintenance-v1";
const getEmployeesSnapshot=()=>({employees:getEmployeeRecordsSnapshot()});
const stored=readLocalTestData<{faults:FaultReport[];orders:MaintenanceOrder[];notifications:MaintenanceNotification[];processed:[string,string][];sequence:number}>(STORAGE_KEY,1,{faults:[],orders:[],notifications:[],processed:[],sequence:100});
let faults:readonly FaultReport[]=stored.faults.map(repairFault);
let orders:readonly MaintenanceOrder[]=stored.orders.map(repairOrder);
let notifications:readonly MaintenanceNotification[]=stored.notifications.map(repairNotification);
let processed=new Map<string,string>(stored.processed);let sequence=stored.sequence;
let snapshot={faults,orders,notifications};const listeners=new Set<()=>void>();

function cloneFault(item:FaultReport):FaultReport{return{...item,accessories:[...item.accessories],evidenceAttachments:item.evidenceAttachments.map((attachment)=>({...attachment}))};}
function cloneOrder(item:MaintenanceOrder):MaintenanceOrder{return{...item,partUsages:item.partUsages.map((usage)=>({...usage})),workshopTransfer:item.workshopTransfer?{...item.workshopTransfer,accessories:[...item.workshopTransfer.accessories]}:null,events:item.events.map((event)=>({...event}))};}
function repairFault(item:FaultReport):FaultReport{const fault=cloneFault(item);return{...fault,itemName:repairMaintenanceText(fault.itemName),itemDescription:repairMaintenanceText(fault.itemDescription),faultDescription:repairMaintenanceText(fault.faultDescription),intakeCondition:repairMaintenanceText(fault.intakeCondition),accessories:fault.accessories.map(repairMaintenanceText),notes:repairMaintenanceText(fault.notes),evidenceAttachments:fault.evidenceAttachments.map((attachment)=>({...attachment,name:repairMaintenanceText(attachment.name)}))};}
function repairOrder(item:MaintenanceOrder):MaintenanceOrder{const order=cloneOrder(item);return{...order,diagnosis:repairMaintenanceText(order.diagnosis),faultCause:repairMaintenanceText(order.faultCause),recommendedAction:repairMaintenanceText(order.recommendedAction),technicianNotes:repairMaintenanceText(order.technicianNotes),partUsages:order.partUsages.map((usage)=>({...usage,note:repairMaintenanceText(usage.note)})),workshopTransfer:order.workshopTransfer?{...order.workshopTransfer,reason:repairMaintenanceText(order.workshopTransfer.reason),conditionBeforeDispatch:repairMaintenanceText(order.workshopTransfer.conditionBeforeDispatch),accessories:order.workshopTransfer.accessories.map(repairMaintenanceText)}:null,events:order.events.map((event)=>({...event,previousValue:repairMaintenanceText(event.previousValue),newValue:repairMaintenanceText(event.newValue),reason:repairMaintenanceText(event.reason)}))};}
function repairNotification(item:MaintenanceNotification):MaintenanceNotification{return{...item,title:repairMaintenanceText(item.title),message:repairMaintenanceText(item.message)};}
const repairedLegacyText=JSON.stringify({faults,orders,notifications})!==JSON.stringify({faults:stored.faults,orders:stored.orders,notifications:stored.notifications});
if(repairedLegacyText)writeLocalTestData(STORAGE_KEY,1,{faults,orders,notifications,processed:[...processed],sequence});
function emit(persist=true){snapshot={faults,orders,notifications};if(persist)writeLocalTestData(STORAGE_KEY,1,{faults,orders,notifications,processed:[...processed],sequence});listeners.forEach((listener)=>listener());}
function audit(order:MaintenanceOrder,type:string,by:string,previousValue:string,newValue:string,reason:string):MaintenanceEvent{return{id:`maintenance-event-${sequence++}`,type,at:now,by,branchId:order.branchId,previousValue,newValue,reason};}
function maintenanceRecipients(notification:MaintenanceNotification){
  const current=getEmployeeRecordsSnapshot();
  const employees=[...current,...EMPLOYEE_FIXTURES.filter((fixture)=>!current.some((employee)=>employee.id===fixture.id))];
  return employees.filter((employee)=>employee.status==="active"&&(notification.recipientEmployeeId
    ? employee.id===notification.recipientEmployeeId
    : employee.roleAssignments.some((assignment)=>assignment.active&&assignment.roleKey===notification.recipientRole)));
}
function publishCentralMaintenanceNotification(notification:MaintenanceNotification){
  const referenceId=notification.href.split("/").filter(Boolean).at(-1)??notification.id;
  const referenceType=notification.href.includes("/orders/")?"maintenance_order":"fault_report";
  maintenanceRecipients(notification).forEach((employee)=>publishNotification({
    recipientUserId:employee.userId,
    recipientEmployeeId:employee.id,
    type:"maintenance_update",
    category:"maintenance",
    priority:notification.title.includes("جاهز")?"normal":"high",
    title:notification.title,
    body:notification.message,
    branchId:notification.recipientRole==="maintenance_technician"?"all":notification.branchId,
    referenceType,
    referenceId,
    deepLink:notification.href,
    createdAt:new Date(notification.createdAt).toISOString(),
    expiresAt:null,
    idempotencyKey:`maintenance:${notification.id}:${employee.id}`,
    metadata:{source:"maintenance"},
  }));
}
function notify(input:Omit<MaintenanceNotification,"id"|"createdAt"|"read">){const notification={...input,id:`maintenance-notification-${sequence++}`,createdAt:now,read:false};notifications=[notification,...notifications];publishCentralMaintenanceNotification(notification);}
export function syncMaintenanceNotifications(){
  notifications.forEach(publishCentralMaintenanceNotification);
  faults.filter((fault)=>fault.acknowledgedAt&&fault.assignedTechnicianId).forEach((fault)=>{
    const technician=maintenanceRecipients({id:`ack-${fault.id}`,recipientEmployeeId:fault.assignedTechnicianId,recipientRole:"maintenance_technician",branchId:fault.branchId,title:"",message:"",href:`/maintenance/faults/${fault.id}`,createdAt:fault.acknowledgedAt!,read:false})[0];
    if(!technician)return;
    publishNotification({recipientUserId:technician.userId,recipientEmployeeId:technician.id,type:"maintenance_acknowledged",category:"maintenance",priority:"normal",title:"أصبحت مسؤولًا عن البلاغ",body:`${fault.faultNumber} · ${fault.itemName}`,branchId:"all",referenceType:"fault_report",referenceId:fault.id,deepLink:`/maintenance/faults/${fault.id}`,createdAt:new Date(fault.acknowledgedAt!).toISOString(),expiresAt:null,idempotencyKey:`maintenance:fault:${fault.id}:acknowledged:${technician.id}`,metadata:{source:"maintenance"}});
  });
}
export function adoptLegacyPreviewTechnicianAssignments(technicianId:string){
  if(!technicianId||technicianId==="employee-technician")return 0;
  const faultIds=new Set(faults.filter((fault)=>fault.assignedTechnicianId==="employee-technician").map((fault)=>fault.id));
  if(!faultIds.size)return 0;
  faults=faults.map((fault)=>faultIds.has(fault.id)?{...fault,assignedTechnicianId:technicianId,updatedAt:now}:fault);
  orders=orders.map((order)=>faultIds.has(order.faultReportId)?{...order,assignedTechnicianId:technicianId,updatedAt:now}:order);
  notifications=notifications.map((notification)=>notification.recipientRole==="maintenance_technician"&&notification.recipientEmployeeId==="employee-technician"?{...notification,recipientEmployeeId:technicianId}:notification);
  notifications.filter((notification)=>notification.recipientEmployeeId===technicianId).forEach(publishCentralMaintenanceNotification);
  emit();return faultIds.size;
}
function replaceOrder(id:string,update:(order:MaintenanceOrder)=>MaintenanceOrder){orders=orders.map((order)=>order.id===id?update(order):order);emit();}
export function subscribeMaintenanceStore(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener);}
export function getMaintenanceSnapshot(){return snapshot;}

export function deleteMaintenanceFault(faultId:string,actorRole:string){
  if(actorRole!=="manager")return{valid:false,message:"حذف البلاغ متاح للمدير فقط."};
  const fault=faults.find((item)=>item.id===faultId);if(!fault)return{valid:false,message:"البلاغ غير موجود أو تم حذفه بالفعل."};
  const linkedOrder=orders.find((item)=>item.faultReportId===faultId);
  if(fault.rentalAssetId)setRentalAssetMaintenanceStatus(fault.rentalAssetId,"available","حذف بلاغ الصيانة بواسطة المدير");
  faults=faults.filter((item)=>item.id!==faultId);
  orders=orders.filter((item)=>item.faultReportId!==faultId);
  notifications=notifications.filter((item)=>!item.href.includes(`/maintenance/faults/${faultId}`)&&(!linkedOrder||!item.href.includes(`/maintenance/orders/${linkedOrder.id}`)));
  if(linkedOrder)processed=new Map([...processed].filter(([,orderId])=>orderId!==linkedOrder.id));
  emit();return{valid:true,message:`تم حذف البلاغ ${fault.faultNumber} والكرت المرتبط به.`};
}

export function createMaintenanceIntake(input:MaintenanceIntakeInput){
  if(processed.has(input.idempotencyKey)){const order=orders.find((item)=>item.id===processed.get(input.idempotencyKey));const fault=order?faults.find((item)=>item.id===order.faultReportId):undefined;return{valid:true,message:"تم استخدام طلب الاستلام المنشأ سابقًا.",fault,order,duplicate:true};}
  const validation=validateMaintenanceIntake(input);if(!validation.valid)return{valid:false,message:Object.values(validation.errors)[0],errors:validation.errors};
  if(input.subjectType==="internal_asset"){
    const asset=getRentalSnapshot().assets.find((item)=>item.id===input.rentalAssetId);
    if(!asset)return{valid:false,message:"أصل التأجير غير موجود."};
    if(asset.branchId!==input.branchId)return{valid:false,message:"أصل التأجير خارج نطاق الفرع المختار."};
    const duplicate=faults.find((fault)=>fault.rentalAssetId===asset.id&&!['closed','cancelled'].includes(fault.status));
    if(duplicate)return{valid:false,message:`يوجد بلاغ مفتوح مطابق ${duplicate.faultNumber}. راجعه قبل إنشاء بلاغ جديد.`,duplicate:true,fault:duplicate};
  }
  const id=`fault-${sequence++}`;const orderId=`maintenance-order-${sequence++}`;const faultNumber=`FLT-2026-${String(sequence).padStart(4,"0")}`;const orderNumber=`MNT-2026-${String(sequence+1).padStart(4,"0")}`;
  const customerItemId=input.subjectType==="customer_item"?`customer-item-${sequence++}`:null;
  const fault:FaultReport={id,faultNumber,branchId:input.branchId,locationId:input.branchId,reportedByEmployeeId:input.reportedByEmployeeId,reportedAt:now,subjectType:input.subjectType,rentalAssetId:input.subjectType==="internal_asset"?input.rentalAssetId:null,customerId:input.subjectType==="customer_item"?input.customerId:null,customerItemId,itemName:input.itemName,itemDescription:[input.itemDescription,input.brandModel,input.serialNumber,input.color].filter(Boolean).join(" · "),faultDescription:input.faultDescription,intakeCondition:input.intakeCondition,accessories:input.accessories,evidenceAttachments:input.attachmentNames.map((name,index)=>({id:`attachment-${id}-${index}`,name,kind:"image",mockUrl:`mock://maintenance/${id}/${index}`})),priority:input.priority,currentLocation:input.branchId,assignedTechnicianId:input.assignedTechnicianId,notifiedAt:now,acknowledgedAt:null,status:input.assignedTechnicianId?"notified":"reported",stoppedOperating:input.stoppedOperating,expectedInspectionAt:input.expectedInspectionAt||null,notes:input.notes,createdAt:now,updatedAt:now};
  const order:MaintenanceOrder={id:orderId,orderNumber,faultReportId:id,subjectType:input.subjectType,branchId:input.branchId,customerId:fault.customerId,rentalAssetId:fault.rentalAssetId,customerItemId,assignedTechnicianId:input.assignedTechnicianId,status:"awaiting_acknowledgement",diagnosis:"",faultCause:"",recommendedAction:"",labourEstimate:0,partsEstimate:0,estimatedTotal:0,approvedEstimate:0,finalLabourAmount:0,finalPartsAmount:0,finalTotal:0,customerApprovalStatus:input.subjectType==="customer_item"?"pending":"not_required",technicianNotes:"",partUsages:[],workshopTransfer:null,labourWarrantyDays:0,partsWarrantyDays:0,startedAt:null,completedAt:null,readyAt:null,deliveredAt:null,expectedCompletionAt:null,currentLocation:input.branchId,events:[{id:`maintenance-event-${sequence++}`,type:"created",at:now,by:input.reportedByEmployeeId,branchId:input.branchId,previousValue:"",newValue:"awaiting_acknowledgement",reason:"استلام صيانة وإنشاء بلاغ Mock"}],createdAt:now,updatedAt:now};
  faults=[fault,...faults];orders=[order,...orders];processed.set(input.idempotencyKey,orderId);
  if(input.subjectType==="internal_asset")setRentalAssetMaintenanceStatus(input.rentalAssetId,"maintenance","فتح بلاغ صيانة داخلي");
  if(input.assignedTechnicianId)notify({recipientEmployeeId:input.assignedTechnicianId,recipientRole:"maintenance_technician",branchId:input.branchId,title:"بلاغ صيانة مسند إليك",message:`${faultNumber} · ${input.itemName} · ${input.faultDescription}`,href:`/maintenance/faults/${id}`});
  else{notify({recipientEmployeeId:null,recipientRole:"maintenance_technician",branchId:input.branchId,title:"بلاغ صيانة مؤهل للاستلام",message:`${faultNumber} · ${input.itemName} · ${input.faultDescription}`,href:`/maintenance/faults/${id}`});notify({recipientEmployeeId:null,recipientRole:"manager",branchId:input.branchId,title:"بلاغ يحتاج تعيين فني",message:`${faultNumber} · ${input.branchId} · ${input.itemName}`,href:`/maintenance/faults/${id}`});}
  emit();return{valid:true,message:"تم إنشاء البلاغ وأمر الصيانة وإرسال الإشعارات Mock.",fault,order,duplicate:false};
}

export function acknowledgeFault(faultId:string,technicianId:string){
  const fault=faults.find((item)=>item.id===faultId);if(!fault)return{valid:false,message:"البلاغ غير موجود."};
  const technician=getEmployeesSnapshot().employees.find((item)=>item.id===technicianId&&item.status==="active"&&item.roleAssignments.some((assignment)=>assignment.roleKey==="maintenance_technician"))??EMPLOYEE_FIXTURES.find((item)=>item.id===technicianId&&item.status==="active"&&item.roleAssignments.some((assignment)=>assignment.roleKey==="maintenance_technician"));
  if(!technician)return{valid:false,message:"الفني غير مؤهل أو غير نشط."};
  if(fault.acknowledgedAt)return{valid:false,message:`البلاغ مستلم بالفعل بواسطة ${EMPLOYEE_FIXTURES.find((item)=>item.id===fault.assignedTechnicianId)?.name??fault.assignedTechnicianId}.`,assignedTechnicianId:fault.assignedTechnicianId};
  if(fault.assignedTechnicianId&&fault.assignedTechnicianId!==technicianId)return{valid:false,message:"البلاغ مسند إلى فني آخر."};
  faults=faults.map((item)=>item.id===faultId?{...item,assignedTechnicianId:technicianId,acknowledgedAt:now,status:"acknowledged",updatedAt:now}:item);
  orders=orders.map((order)=>order.faultReportId===faultId?{...order,assignedTechnicianId:technicianId,status:"acknowledged",events:[audit(order,"acknowledged",technicianId,order.status,"acknowledged","تأكيد استلام البلاغ"),...order.events],updatedAt:now}:order);
  markNotificationActedByReference("fault_report",faultId,technician.userId);
  notify({recipientEmployeeId:null,recipientRole:"manager",branchId:fault.branchId,title:"تم تأكيد استلام البلاغ",message:`${fault.faultNumber} · ${technician.name}`,href:`/maintenance/faults/${faultId}`});
  notify({recipientEmployeeId:technicianId,recipientRole:"maintenance_technician",branchId:fault.branchId,title:"أصبحت مسؤولًا عن البلاغ",message:`${fault.faultNumber} · ${fault.itemName}`,href:`/maintenance/faults/${faultId}`});emit();return{valid:true,message:"تم تأكيد الاستلام وأصبح الفني مسؤولًا عن البلاغ."};
}

export function reassignTechnician(orderId:string,technicianId:string,actor:string,reason:string){
  const order=orders.find((item)=>item.id===orderId);if(!order)return{valid:false,message:"أمر الصيانة غير موجود."};if(!reason.trim())return{valid:false,message:"سبب إعادة التعيين إلزامي."};
  const technician=getEmployeesSnapshot().employees.find((item)=>item.id===technicianId&&item.status==="active"&&item.roleAssignments.some((assignment)=>assignment.roleKey==="maintenance_technician"))??EMPLOYEE_FIXTURES.find((item)=>item.id===technicianId&&item.status==="active"&&item.roleAssignments.some((assignment)=>assignment.roleKey==="maintenance_technician"));if(!technician)return{valid:false,message:"الفني غير مؤهل."};
  replaceOrder(orderId,(item)=>({...item,assignedTechnicianId:technicianId,events:[audit(item,"reassigned",actor,item.assignedTechnicianId??"",technicianId,reason),...item.events],updatedAt:now}));
  faults=faults.map((fault)=>fault.id===order.faultReportId?{...fault,assignedTechnicianId:technicianId,updatedAt:now}:fault);notify({recipientEmployeeId:technicianId,recipientRole:"maintenance_technician",branchId:order.branchId,title:"إعادة تعيين أمر صيانة",message:`${order.orderNumber} · ${reason}`,href:`/maintenance/orders/${orderId}`});emit();return{valid:true,message:"تمت إعادة تعيين الفني وتوثيق السبب."};
}

export function saveDiagnosis(input:DiagnosisInput){
  const order=orders.find((item)=>item.id===input.orderId);if(!order)return{valid:false,message:"أمر الصيانة غير موجود."};
  if(order.assignedTechnicianId!==input.technicianId)return{valid:false,message:"التشخيص متاح للفني المسؤول فقط."};
  if(!input.diagnosis.trim()||!input.faultCause.trim()||!input.recommendedAction.trim())return{valid:false,message:"التشخيص وسبب العطل والإجراء المقترح إلزامية."};
  const next:MaintenanceStatus=order.subjectType==="customer_item"&&input.labourEstimate>0?"awaiting_customer_approval":input.needsWorkshop?"transfer_requested":"in_repair";
  replaceOrder(input.orderId,(item)=>({...item,diagnosis:input.diagnosis,faultCause:input.faultCause,recommendedAction:input.recommendedAction,labourEstimate:Math.max(0,input.labourEstimate),estimatedTotal:Math.max(0,input.labourEstimate)+item.partsEstimate,expectedCompletionAt:input.expectedCompletionAt||null,labourWarrantyDays:Math.max(0,input.labourWarrantyDays),partsWarrantyDays:Math.max(0,input.partsWarrantyDays),technicianNotes:input.notes,status:next,events:[audit(item,"diagnosis",input.technicianId,item.status,next,"إضافة التشخيص الفني"),...item.events],updatedAt:now}));
  if(order.subjectType==="customer_item"&&input.labourEstimate>0)notify({recipientEmployeeId:null,recipientRole:"rental_maintenance_employee",branchId:order.branchId,title:"تقدير صيانة ينتظر موافقة العميل",message:`${order.orderNumber} · ${input.labourEstimate.toLocaleString("ar-EG-u-nu-latn")} ج.م`,href:`/maintenance/orders/${order.id}`});emit();return{valid:true,message:"تم حفظ التشخيص وتحديث الحالة."};
}

export function setCustomerApproval(orderId:string,status:"approved"|"rejected",actor:string,reason:string){
  const order=orders.find((item)=>item.id===orderId);if(!order||order.subjectType!=="customer_item")return{valid:false,message:"موافقة العميل غير مطلوبة لهذا الأمر."};if(!reason.trim())return{valid:false,message:"نتيجة التواصل وسببها إلزاميان."};
  const next:MaintenanceStatus=status==="approved"?"in_repair":"cancelled";replaceOrder(orderId,(item)=>({...item,customerApprovalStatus:status,approvedEstimate:status==="approved"?item.estimatedTotal:0,status:next,startedAt:status==="approved"?now:null,events:[audit(item,"customer_approval",actor,item.customerApprovalStatus,status,reason),...item.events],updatedAt:now}));
  notify({recipientEmployeeId:order.assignedTechnicianId,recipientRole:"maintenance_technician",branchId:order.branchId,title:status==="approved"?"وافق العميل على الإصلاح":"رفض العميل الإصلاح",message:`${order.orderNumber} · ${reason}`,href:`/maintenance/orders/${orderId}`});emit();return{valid:true,message:status==="approved"?"تم تسجيل موافقة العميل ويمكن بدء الإصلاح.":"تم تسجيل الرفض وإلغاء الأمر دون حذف."};
}

export function requestPart(orderId:string,productId:string,quantity:number,technicianId:string,note:string){
  const order=orders.find((item)=>item.id===orderId);const product=getProductSnapshot().products.find((item)=>item.id===productId);if(!order||order.assignedTechnicianId!==technicianId)return{valid:false,message:"طلب القطعة متاح للفني المسؤول فقط."};if(!product||product.type!=="spare_part")return{valid:false,message:"اختر قطعة غيار فقط."};if(quantity<=0)return{valid:false,message:"الكمية غير صحيحة."};
  const usage:PartUsage={id:`part-usage-${sequence++}`,maintenanceOrderId:orderId,productId,locationId:order.currentLocation==="workshop"?"workshop":order.branchId,quantityRequested:quantity,quantityIssued:0,status:"requested",issuedBy:null,issuedAt:null,note};replaceOrder(orderId,(item)=>({...item,status:"awaiting_part",partUsages:[usage,...item.partUsages],partsEstimate:item.partsEstimate+product.salePrice*quantity,estimatedTotal:item.labourEstimate+item.partsEstimate+product.salePrice*quantity,events:[audit(item,"part_requested",technicianId,item.status,"awaiting_part",note||product.name),...item.events],updatedAt:now}));notify({recipientEmployeeId:null,recipientRole:"manager",branchId:order.branchId,title:"طلب قطعة غيار",message:`${order.orderNumber} · ${product.name} × ${quantity}`,href:`/maintenance/orders/${orderId}`});emit();return{valid:true,message:"تم إنشاء طلب قطعة غيار مرتبط بالأمر."};
}

export function issuePart(orderId:string,usageId:string,quantity:number,actor:string){
  const order=orders.find((item)=>item.id===orderId);const usage=order?.partUsages.find((item)=>item.id===usageId);if(!order||!usage)return{valid:false,message:"طلب القطعة غير موجود."};if(quantity<=0||quantity>usage.quantityRequested-usage.quantityIssued)return{valid:false,message:"كمية الصرف غير صحيحة."};
  const stock=commitMaintenancePartStock(usage.productId,usage.locationId,quantity,order.orderNumber);if(!stock.valid){replaceOrder(orderId,(item)=>({...item,partUsages:item.partUsages.map((part)=>part.id===usageId?{...part,status:"unavailable"}:part),events:[audit(item,"part_unavailable",actor,usage.status,"unavailable",stock.message),...item.events],updatedAt:now}));return stock;}
  const totalIssued=usage.quantityIssued+quantity;replaceOrder(orderId,(item)=>({...item,status:"in_repair",partUsages:item.partUsages.map((part)=>part.id===usageId?{...part,quantityIssued:totalIssued,status:totalIssued===part.quantityRequested?"issued":"partially_issued",issuedBy:actor,issuedAt:now}:part),events:[audit(item,"part_issued",actor,usage.status,totalIssued===usage.quantityRequested?"issued":"partially_issued","صرف قطعة داخل أمر الصيانة"),...item.events],updatedAt:now}));emit();return{valid:true,message:"تم صرف القطعة وخفض Mock Stock."};
}


export function requestWorkshopTransfer(orderId:string,actor:string,reason:string,condition:string){
  const order=orders.find((item)=>item.id===orderId);const fault=faults.find((item)=>item.id===order?.faultReportId);if(!order||!fault)return{valid:false,message:"أمر الصيانة غير موجود."};if(order.workshopTransfer||["workshop","in_transit"].includes(order.currentLocation)||["transfer_requested","in_transit_to_workshop","received_at_workshop","ready_for_return","returning_to_branch","ready_for_delivery","delivered","closed","cancelled"].includes(order.status))return{valid:false,message:"يوجد تحويل قائم بالفعل أو أن اللعبة لم تعد مؤهلة للاستلام من الفرع."};if(!reason.trim()||!condition.trim())return{valid:false,message:"سبب التحويل والحالة قبل الإرسال إلزاميان."};
  const transfer:WorkshopTransfer={id:`transfer-${sequence++}`,maintenanceOrderId:orderId,fromBranchId:order.branchId,toLocationId:"workshop",status:"transfer_requested",reason,conditionBeforeDispatch:condition,accessories:fault.accessories,dispatchedBy:null,receivedBy:null,dispatchedAt:null,receivedAt:null,returnedAt:null};replaceOrder(orderId,(item)=>({...item,status:"transfer_requested",workshopTransfer:transfer,events:[audit(item,"transfer_requested",actor,item.status,"transfer_requested",reason),...item.events],updatedAt:now}));notify({recipientEmployeeId:null,recipientRole:"manager",branchId:order.branchId,title:"طلب تحويل للورشة",message:`${order.orderNumber} · ${reason}`,href:`/maintenance/orders/${orderId}`});emit();return{valid:true,message:"تم إنشاء طلب التحويل للورشة المركزية."};
}

export function updateWorkshopTransfer(orderId:string,action:"dispatch"|"receive"|"ready_return"|"dispatch_return"|"return_branch",actor:string){
  const order=orders.find((item)=>item.id===orderId);if(!order?.workshopTransfer)return{valid:false,message:"لا يوجد تحويل مرتبط بالأمر."};
  const map={dispatch:{transfer:"in_transit" as const,status:"in_transit_to_workshop" as const,location:"in_transit"},receive:{transfer:"received" as const,status:"received_at_workshop" as const,location:"workshop"},ready_return:{transfer:"ready_to_return" as const,status:"ready_for_return" as const,location:"workshop"},dispatch_return:{transfer:"returning_to_branch" as const,status:"returning_to_branch" as const,location:"in_transit"},return_branch:{transfer:"returned_to_branch" as const,status:"ready_for_delivery" as const,location:order.branchId}};const next=map[action];
  replaceOrder(orderId,(item)=>({...item,status:next.status,currentLocation:next.location,workshopTransfer:{...item.workshopTransfer!,status:next.transfer,dispatchedBy:action==="dispatch"?actor:item.workshopTransfer!.dispatchedBy,dispatchedAt:action==="dispatch"?now:item.workshopTransfer!.dispatchedAt,receivedBy:action==="receive"?actor:item.workshopTransfer!.receivedBy,receivedAt:action==="receive"?now:item.workshopTransfer!.receivedAt,returnedAt:action==="return_branch"?now:item.workshopTransfer!.returnedAt},events:[audit(item,"transfer",actor,item.currentLocation,next.location,action),...item.events],updatedAt:now}));if(action==="receive")notify({recipientEmployeeId:null,recipientRole:"rental_maintenance_employee",branchId:order.branchId,title:"وصلت اللعبة إلى الورشة",message:`${order.orderNumber} · تم تأكيد الاستلام بالورشة`,href:`/maintenance/orders/${orderId}`});if(action==="dispatch_return")notify({recipientEmployeeId:null,recipientRole:"rental_maintenance_employee",branchId:order.branchId,title:"اللعبة في طريق العودة للفرع",message:`${order.orderNumber} · خرجت من الورشة`,href:`/maintenance/orders/${orderId}`});if(action==="return_branch")notify({recipientEmployeeId:null,recipientRole:"rental_maintenance_employee",branchId:order.branchId,title:"عادت اللعبة إلى الفرع",message:`${order.orderNumber} · جاهزة لاستكمال التسليم`,href:`/maintenance/orders/${orderId}`});emit();return{valid:true,message:"تم تحديث موقع اللعبة وحالة التحويل."};
}

export function updateMaintenanceStatus(orderId:string,status:MaintenanceStatus,actor:string,reason:string){
  const order=orders.find((item)=>item.id===orderId);if(!order)return{valid:false,message:"أمر الصيانة غير موجود."};if(!reason.trim())return{valid:false,message:"سبب تحديث الحالة إلزامي."};if(status==="in_repair"&&order.subjectType==="customer_item"&&order.estimatedTotal>0&&order.customerApprovalStatus!=="approved")return{valid:false,message:"لا يمكن بدء إصلاح مدفوع قبل موافقة العميل."};
  replaceOrder(orderId,(item)=>({...item,status,startedAt:status==="in_repair"?item.startedAt??now:item.startedAt,completedAt:status==="quality_check"?now:item.completedAt,readyAt:["ready_for_return","ready_for_delivery"].includes(status)?now:item.readyAt,deliveredAt:status==="delivered"?now:item.deliveredAt,events:[audit(item,"status",actor,item.status,status,reason),...item.events],updatedAt:now}));
  if(status==="ready_for_delivery")notify({recipientEmployeeId:null,recipientRole:"rental_maintenance_employee",branchId:order.branchId,title:"لعبة جاهزة للتسليم",message:`${order.orderNumber} · جاهزة للتواصل مع العميل`,href:`/maintenance/orders/${orderId}`});
  if(status==="closed"&&order.rentalAssetId)setRentalAssetMaintenanceStatus(order.rentalAssetId,"available","إغلاق أمر الصيانة بعد الفحص النهائي");emit();return{valid:true,message:"تم تحديث حالة أمر الصيانة بنجاح."};
}

export function resetMaintenanceStore(){faults=MAINTENANCE_FAULT_FIXTURES.map(cloneFault);orders=MAINTENANCE_ORDER_FIXTURES.map(cloneOrder);notifications=MAINTENANCE_NOTIFICATION_FIXTURES.map((item)=>({...item}));processed=new Map();sequence=100;removeLocalTestData(STORAGE_KEY);emit(false);}
