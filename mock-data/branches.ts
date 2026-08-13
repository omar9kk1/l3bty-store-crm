import type { Branch, BranchOption } from "@/features/branches/types";

export const ALL_BRANCH_OPTION: BranchOption = { id: "all", nameAr: "كل الفروع", code: "ALL" };

export const BRANCH_FIXTURES: readonly Branch[] = [
  {
    id: "main", code: "BR01", name: "الفرع الرئيسي", type: "branch", status: "active",
    phone: "01010000001", alternatePhone: "01110000001", city: "القاهرة", area: "منطقة تجريبية أ",
    address: "شارع تجريبي 10، مبنى 1", latitude: 30.0444, longitude: 31.2357, geofenceRadiusMeters: 150,
    timezone: "Africa/Cairo", managerEmployeeId: "employee-manager-01",
    workingHours: [{ id: "main-hours", label: "السبت إلى الخميس", days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"], opensAt: "10:00", closesAt: "23:00", crossesMidnight: false }],
    assignedEmployeeCount: 12, warehouseCount: 2, cashboxCount: 2, activeRentalAssetCount: 18, saleProductCount: 86,
    openMaintenanceOrderCount: 5, openShiftCount: 2, createdAt: "2025-01-10T08:00:00Z", updatedAt: "2026-08-04T11:20:00Z",
    notes: "بيانات تجريبية للفرع الرئيسي.", technicianCount: 2, sparePartCount: 34, incomingMaintenanceTransferCount: 1, repairingItemCount: 3, readyReturnCount: 2,
  },
  {
    id: "branch-2", code: "BR02", name: "فرع 2", type: "branch", status: "active",
    phone: "01010000002", alternatePhone: "", city: "الجيزة", area: "منطقة تجريبية ب",
    address: "طريق تجريبي 22، مبنى 2", latitude: 30.0131, longitude: 31.2089, geofenceRadiusMeters: 120,
    timezone: "Africa/Cairo", managerEmployeeId: "employee-manager-02",
    workingHours: [{ id: "branch-2-hours", label: "يوميًا", days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"], opensAt: "11:00", closesAt: "00:30", crossesMidnight: true }],
    assignedEmployeeCount: 9, warehouseCount: 1, cashboxCount: 1, activeRentalAssetCount: 12, saleProductCount: 64,
    openMaintenanceOrderCount: 3, openShiftCount: 1, createdAt: "2025-03-15T08:00:00Z", updatedAt: "2026-08-03T09:45:00Z",
    notes: "بيانات تجريبية لفرع 2.", technicianCount: 1, sparePartCount: 18, incomingMaintenanceTransferCount: 1, repairingItemCount: 2, readyReturnCount: 1,
  },
  {
    id: "branch-3", code: "BR03", name: "فرع 3", type: "branch", status: "temporarily_closed",
    phone: "01010000003", alternatePhone: "", city: "القاهرة", area: "منطقة تجريبية ج",
    address: "محور تجريبي 7، مبنى 3", latitude: 30.105, longitude: 31.34, geofenceRadiusMeters: 100,
    timezone: "Africa/Cairo", managerEmployeeId: "employee-manager-03",
    workingHours: [{ id: "branch-3-hours", label: "السبت إلى الخميس", days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"], opensAt: "12:00", closesAt: "22:00", crossesMidnight: false }],
    assignedEmployeeCount: 7, warehouseCount: 1, cashboxCount: 1, activeRentalAssetCount: 8, saleProductCount: 52,
    openMaintenanceOrderCount: 2, openShiftCount: 0, createdAt: "2025-06-01T08:00:00Z", updatedAt: "2026-08-02T15:10:00Z",
    notes: "مغلق مؤقتًا للصيانة الداخلية ضمن سيناريو الاختبار.", technicianCount: 1, sparePartCount: 12, incomingMaintenanceTransferCount: 0, repairingItemCount: 1, readyReturnCount: 0,
  },
  {
    id: "workshop", code: "WRK", name: "الورشة المركزية", type: "central_workshop", status: "active",
    phone: "01010000004", alternatePhone: "01210000004", city: "القاهرة", area: "منطقة صناعية تجريبية",
    address: "مجمع فني تجريبي، وحدة 4", latitude: 30.071, longitude: 31.281, geofenceRadiusMeters: 250,
    timezone: "Africa/Cairo", managerEmployeeId: "employee-manager-04",
    workingHours: [{ id: "workshop-hours", label: "السبت إلى الخميس", days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"], opensAt: "09:00", closesAt: "19:00", crossesMidnight: false }],
    assignedEmployeeCount: 8, warehouseCount: 1, cashboxCount: 0, activeRentalAssetCount: 0, saleProductCount: 0,
    openMaintenanceOrderCount: 11, openShiftCount: 1, createdAt: "2025-02-20T08:00:00Z", updatedAt: "2026-08-05T07:30:00Z",
    notes: "موقع صيانة مستقل ومخزن قطع غيار فنية.", technicianCount: 6, sparePartCount: 128, incomingMaintenanceTransferCount: 7, repairingItemCount: 9, readyReturnCount: 4,
  },
];

export const BRANCH_MANAGER_FIXTURES = [
  { id: "employee-manager-01", name: "مدير تجريبي 01" },
  { id: "employee-manager-02", name: "مدير تجريبي 02" },
  { id: "employee-manager-03", name: "مدير تجريبي 03" },
  { id: "employee-manager-04", name: "مشرف الورشة التجريبي" },
] as const;

export function toBranchOption(branch: Branch): BranchOption {
  return { id: branch.id, nameAr: branch.name, code: branch.code, type: branch.type, status: branch.status };
}
