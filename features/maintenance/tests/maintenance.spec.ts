import { beforeEach, describe, expect, it } from "vitest";
import { filterNavigation } from "@/permissions/navigation-policy";
import { resolvePermissions } from "@/permissions/resolve-permissions";
import { resetProductStore } from "@/features/products/services/product-store";
import { resetRentalStore } from "@/features/rentals/services/rental-store";
import { canIntakeMaintenance, canSendMaintenanceWhatsApp, canStartWorkshopPickup, canViewMaintenance, canWorkMaintenance } from "../permissions";
import { acknowledgeFault, createMaintenanceIntake, getMaintenanceSnapshot, issuePart, requestPart, resetMaintenanceStore, saveDiagnosis, setCustomerApproval, updateMaintenanceStatus, updateWorkshopTransfer } from "../services/maintenance-store";
import { buildMaintenanceWhatsAppUrl } from "../services/maintenance-whatsapp-service";

describe("maintenance contracts",()=>{
  beforeEach(()=>{resetProductStore();resetRentalStore();resetMaintenanceStore();});

  it("enforces the approved role separation and technician destination",()=>{
    expect(canViewMaintenance(["owner"])).toBe(true);expect(canIntakeMaintenance(["rental_maintenance_employee"])).toBe(true);
    expect(canWorkMaintenance(["rental_maintenance_employee"])).toBe(false);expect(canWorkMaintenance(["maintenance_technician"])).toBe(true);
    expect(canViewMaintenance(["sales_employee"])).toBe(false);expect(canSendMaintenanceWhatsApp(["maintenance_technician"])).toBe(false);
    expect(filterNavigation(resolvePermissions(["maintenance_technician"])).find((item)=>item.key==="maintenance")?.href).toBe("/maintenance/faults");
    expect(filterNavigation(resolvePermissions(["rental_maintenance_employee"])).find((item)=>item.key==="maintenance")?.href).toBe("/maintenance");
  });

  it("validates customer intake and is idempotent",()=>{
    const input={subjectType:"customer_item" as const,branchId:"main",reportedByEmployeeId:"employee-rental",rentalAssetId:"",customerId:"customer-001",itemName:"عربية أطفال كهربائية",itemDescription:"لعبة عميل",brandModel:"موديل 2025",serialNumber:"SER-1",color:"أحمر",faultDescription:"لا تعمل بعد الشحن",intakeCondition:"خدوش بسيطة موثقة",accessories:["بطارية","شاحن"],priority:"high" as const,stoppedOperating:true,expectedInspectionAt:"2026-08-07T11:00",notes:"",assignedTechnicianId:null,attachmentNames:["front.jpg"],idempotencyKey:"maintenance-test-intake"};
    const first=createMaintenanceIntake(input);const second=createMaintenanceIntake(input);expect(first.valid).toBe(true);expect(second.valid).toBe(true);expect(getMaintenanceSnapshot().orders.filter((item)=>item.customerItemId===first.order?.customerItemId)).toHaveLength(1);
  });

  it("prevents two technicians from acknowledging the same fault",()=>{
    expect(acknowledgeFault("fault-1","employee-technician").valid).toBe(true);
    const second=acknowledgeFault("fault-1","employee-technician");expect(second.valid).toBe(false);expect(second.message).toContain("بالفعل");
  });

  it("requires customer approval before a paid repair starts",()=>{
    expect(updateMaintenanceStatus("maintenance-order-4","in_repair","employee-technician","بدء العمل").valid).toBe(false);
    expect(setCustomerApproval("maintenance-order-4","approved","employee-manager","موافقة هاتفية").valid).toBe(true);
    expect(updateMaintenanceStatus("maintenance-order-4","in_repair","employee-technician","بدء العمل").valid).toBe(true);
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
});
