import { beforeEach, describe, expect, it } from "vitest";
import { filterNavigation } from "@/permissions/navigation-policy";
import { resolvePermissions } from "@/permissions/resolve-permissions";
import { resetProductStore } from "@/features/products/services/product-store";
import { resetRentalStore } from "@/features/rentals/services/rental-store";
import { canReceiveNotification } from "@/features/notifications/permissions";
import { getNotificationsSnapshot, resetNotificationStore } from "@/features/notifications/services/notification-service";
import { canIntakeMaintenance, canManageMaintenance, canManageWorkshop, canSendMaintenanceWhatsApp, canStartWorkshopPickup, canViewMaintenance, canWorkMaintenance } from "../permissions";
import { acknowledgeFault, adoptLegacyPreviewTechnicianAssignments, createMaintenanceIntake, deleteMaintenanceFault, getMaintenanceSnapshot, issuePart, requestPart, resetMaintenanceStore, saveDiagnosis, setCustomerApproval, syncMaintenanceNotifications, updateMaintenanceStatus, updateWorkshopTransfer } from "../services/maintenance-store";
import { buildMaintenanceWhatsAppUrl } from "../services/maintenance-whatsapp-service";
import { repairMaintenanceText } from "../services/repair-maintenance-text";
import { maintenanceIntakeHref } from "../services/maintenance-navigation";

describe("maintenance contracts",()=>{
  beforeEach(()=>{resetProductStore();resetRentalStore();resetMaintenanceStore();resetNotificationStore();});

  it("enforces the approved role separation and technician destination",()=>{
    expect(canViewMaintenance(["owner"])).toBe(true);expect(canIntakeMaintenance(["rental_maintenance_employee"])).toBe(true);
    expect(canWorkMaintenance(["rental_maintenance_employee"])).toBe(false);expect(canWorkMaintenance(["maintenance_technician"])).toBe(true);
    expect(canIntakeMaintenance(["owner"])).toBe(false);expect(canIntakeMaintenance(["manager"])).toBe(false);
    expect(canManageMaintenance(["owner"])).toBe(false);expect(canWorkMaintenance(["owner"])).toBe(false);expect(canManageWorkshop(["owner"])).toBe(false);
    expect(canManageMaintenance(["manager"])).toBe(true);expect(canWorkMaintenance(["manager"])).toBe(true);expect(canManageWorkshop(["manager"])).toBe(true);
    expect(canViewMaintenance(["sales_employee"])).toBe(false);expect(canSendMaintenanceWhatsApp(["maintenance_technician"])).toBe(false);
    expect(filterNavigation(resolvePermissions(["maintenance_technician"])).find((item)=>item.key==="maintenance")?.href).toBe("/maintenance/faults");
    expect(filterNavigation(resolvePermissions(["rental_maintenance_employee"])).find((item)=>item.key==="maintenance")?.href).toBe("/maintenance");
  });

  it("validates customer intake and is idempotent",()=>{
    const input={subjectType:"customer_item" as const,branchId:"main",reportedByEmployeeId:"employee-rental",rentalAssetId:"",customerId:"customer-001",itemName:"عربية أطفال كهربائية",itemDescription:"لعبة عميل",brandModel:"موديل 2025",serialNumber:"SER-1",color:"أحمر",faultDescription:"لا تعمل بعد الشحن",intakeCondition:"خدوش بسيطة موثقة",accessories:["بطارية","شاحن"],priority:"high" as const,stoppedOperating:true,expectedInspectionAt:"2026-08-07T11:00",notes:"",assignedTechnicianId:null,attachmentNames:["front.jpg"],idempotencyKey:"maintenance-test-intake"};
    const first=createMaintenanceIntake(input);const second=createMaintenanceIntake(input);expect(first.valid).toBe(true);expect(second.valid).toBe(true);expect(second.fault?.faultNumber).toBe(first.fault?.faultNumber);expect(getMaintenanceSnapshot().orders.filter((item)=>item.customerItemId===first.order?.customerItemId)).toHaveLength(1);
  });

  it("prevents two technicians from acknowledging the same fault",()=>{
    expect(acknowledgeFault("fault-1","employee-technician").valid).toBe(true);
    const second=acknowledgeFault("fault-1","employee-technician");expect(second.valid).toBe(false);expect(second.message).toContain("بالفعل");
  });

  it("publishes maintenance acknowledgement to the technician notification center",()=>{
    expect(acknowledgeFault("fault-1","employee-technician").valid).toBe(true);
    syncMaintenanceNotifications();syncMaintenanceNotifications();
    const notification=getNotificationsSnapshot().notifications.find((item)=>item.referenceId==="fault-1"&&item.type==="maintenance_update"&&item.recipientEmployeeId==="employee-technician");
    expect(notification?.status).toBe("unread");
    expect(notification&&canReceiveNotification(notification,["maintenance_technician"])).toBe(true);
    expect(getNotificationsSnapshot().notifications.find((item)=>item.referenceId==="fault-1"&&item.type==="maintenance_acknowledged")?.status).toBe("unread");
  });

  it("moves legacy preview assignments to the technician selected in the session",()=>{
    const legacyFault=getMaintenanceSnapshot().faults.find((item)=>item.assignedTechnicianId==="employee-technician")!;
    expect(adoptLegacyPreviewTechnicianAssignments("employee-selected-technician")).toBeGreaterThan(0);
    expect(getMaintenanceSnapshot().faults.find((item)=>item.id===legacyFault.id)?.assignedTechnicianId).toBe("employee-selected-technician");
    expect(getMaintenanceSnapshot().orders.find((item)=>item.faultReportId===legacyFault.id)?.assignedTechnicianId).toBe("employee-selected-technician");
    expect(adoptLegacyPreviewTechnicianAssignments("employee-selected-technician")).toBe(0);
  });

  it("requires customer approval before a paid repair starts",()=>{
    expect(updateMaintenanceStatus("maintenance-order-4","in_repair","employee-technician","بدء العمل").valid).toBe(false);
    expect(setCustomerApproval("maintenance-order-4","approved","employee-manager","موافقة هاتفية").valid).toBe(true);
    const updateResult=updateMaintenanceStatus("maintenance-order-4","in_repair","employee-technician","بدء العمل");
    expect(updateResult.valid).toBe(true);
    expect(updateResult.message).toBe("تم تحديث حالة أمر الصيانة بنجاح.");
  });

  it("keeps diagnosis and spare parts linked to the assigned order",()=>{
    expect(saveDiagnosis({orderId:"maintenance-order-3",technicianId:"employee-technician",diagnosis:"ضعف وحدة التحكم",faultCause:"تلف كهربائي",recommendedAction:"استبدال الجزء",labourEstimate:0,expectedCompletionAt:"",labourWarrantyDays:30,partsWarrantyDays:90,needsWorkshop:false,notes:""}).valid).toBe(true);
    const requested=requestPart("maintenance-order-3","part-battery-12v",999,"employee-technician","اختبار عدم كفاية المخزون");expect(requested.valid).toBe(true);
    const usage=getMaintenanceSnapshot().orders.find((item)=>item.id==="maintenance-order-3")!.partUsages[0];expect(issuePart("maintenance-order-3",usage.id,999,"employee-manager").valid).toBe(false);
  });

  it("tracks one current location through workshop transfer transitions",()=>{
    expect(updateWorkshopTransfer("maintenance-order-7","receive","employee-technician").valid).toBe(true);expect(getMaintenanceSnapshot().orders.find((item)=>item.id==="maintenance-order-7")?.currentLocation).toBe("workshop");
    expect(updateWorkshopTransfer("maintenance-order-7","return_branch","employee-technician").valid).toBe(true);expect(getMaintenanceSnapshot().orders.find((item)=>item.id==="maintenance-order-7")?.currentLocation).toBe("branch-2");
  });


  it("shows workshop pickup only for an assigned game still at the branch",()=>{
    const orders=getMaintenanceSnapshot().orders;
    expect(canStartWorkshopPickup(orders.find((item)=>item.id==="maintenance-order-2"),"employee-technician")).toBe(true);
    expect(canStartWorkshopPickup(orders.find((item)=>item.id==="maintenance-order-1"),"employee-technician")).toBe(false);
    expect(canStartWorkshopPickup(orders.find((item)=>item.id==="maintenance-order-7"),"employee-technician")).toBe(false);
    expect(canStartWorkshopPickup(orders.find((item)=>item.id==="maintenance-order-8"),"employee-technician")).toBe(false);
  });
  it("creates manual WhatsApp links only for valid Egyptian mobile numbers",()=>{
    expect(buildMaintenanceWhatsAppUrl("01012345678","ready","MNT-1","لعبة")).toContain("wa.me/201012345678");expect(buildMaintenanceWhatsAppUrl("123","ready","MNT-1","لعبة")).toBeNull();
  });

  it("lets only the manager delete a fault card and its linked order",()=>{
    const before=getMaintenanceSnapshot();const fault=before.faults[0];const linked=before.orders.find((item)=>item.faultReportId===fault.id);
    expect(deleteMaintenanceFault(fault.id,"owner").valid).toBe(false);
    expect(deleteMaintenanceFault(fault.id,"manager").valid).toBe(true);
    expect(getMaintenanceSnapshot().faults.some((item)=>item.id===fault.id)).toBe(false);
    expect(linked&&getMaintenanceSnapshot().orders.some((item)=>item.id===linked.id)).toBe(false);
    expect(deleteMaintenanceFault(fault.id,"manager").valid).toBe(false);
  });
  it("sends a fault registration number without presenting it as an invoice or diagnosis",()=>{
    const url=buildMaintenanceWhatsAppUrl("01012345678","fault_registered","FLT-2026-76767","هوفر بورد");
    const message=decodeURIComponent(url??"");
    expect(message).toContain("تم تسجيل العطل");expect(message).toContain("FLT-2026-76767");expect(message).toContain("التواصل معك في أقرب وقت");expect(message).not.toContain("فاتورة");expect(message).not.toContain("تكلفة");
  });
  it("repairs legacy Arabic maintenance text without changing healthy text",()=>{
    expect(repairMaintenanceText("Ø¯Ø±ÙØª")).toBe("درفت");
    expect(repairMaintenanceText("نور اللعبة مش شغال")).toBe("نور اللعبة مش شغال");
    expect(repairMaintenanceText("Hover Board G1")).toBe("Hover Board G1");
  });
  it("keeps the completed intake addressable until the employee starts a new intake",()=>{
    expect(maintenanceIntakeHref("customer_item","maintenance-order-107")).toBe("/maintenance/intake?type=customer_item&receipt=maintenance-order-107");
    expect(maintenanceIntakeHref("customer_item")).toBe("/maintenance/intake?type=customer_item");
  });
});
