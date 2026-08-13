export type BranchType = "branch" | "central_workshop";
export type BranchStatus = "active" | "inactive" | "temporarily_closed";
export type BranchSort = "name" | "code" | "updated" | "employees";
export type BranchViewState = "normal" | "loading" | "empty" | "error" | "offline";

export interface BranchWorkingHoursPeriod {
  id: string;
  label: string;
  days: string[];
  opensAt: string;
  closesAt: string;
  crossesMidnight: boolean;
}

export interface Branch {
  id: string;
  /** Compatibility alias used by aggregate report readers. */
  kind?: BranchType;
  code: string;
  name: string;
  type: BranchType;
  status: BranchStatus;
  phone: string;
  alternatePhone: string;
  address: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  timezone: string;
  managerEmployeeId: string;
  workingHours: BranchWorkingHoursPeriod[];
  assignedEmployeeCount: number;
  warehouseCount: number;
  cashboxCount: number;
  activeRentalAssetCount: number;
  saleProductCount: number;
  openMaintenanceOrderCount: number;
  openShiftCount: number;
  createdAt: string;
  updatedAt: string;
  notes: string;
  technicianCount: number;
  sparePartCount: number;
  incomingMaintenanceTransferCount: number;
  repairingItemCount: number;
  readyReturnCount: number;
}

export interface BranchOption {
  id: string;
  nameAr: string;
  code: string;
  type?: BranchType;
  status?: BranchStatus;
}

export interface BranchQuery {
  q: string;
  type: BranchType | "all";
  status: BranchStatus | "all";
  sort: BranchSort;
}

export interface BranchSummaryData {
  active: number;
  inactive: number;
  employees: number;
  openShifts: number;
  openMaintenance: number;
}

export interface BranchFormValues {
  name: string;
  code: string;
  type: BranchType;
  status: BranchStatus;
  phone: string;
  alternatePhone: string;
  city: string;
  area: string;
  address: string;
  managerEmployeeId: string;
  latitude: string;
  longitude: string;
  geofenceRadiusMeters: string;
  opensAt: string;
  closesAt: string;
  crossesMidnight: boolean;
  notes: string;
  statusReason: string;
}

export type BranchFormErrors = Partial<Record<keyof BranchFormValues, string>>;

export interface BranchFormValidation {
  valid: boolean;
  errors: BranchFormErrors;
  duplicate?: Branch;
  normalizedValues: BranchFormValues;
}

export interface BranchAccess {
  canManage: boolean;
  canViewEmployees: boolean;
  canViewWarehouses: boolean;
  canViewCashboxes: boolean;
  canViewSales: boolean;
  canViewRentals: boolean;
  canViewMaintenance: boolean;
  canViewShifts: boolean;
}
