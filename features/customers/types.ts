export type CustomerStatus = "active" | "inactive" | "blocked";

export type CustomerFlag =
  | "rental_ban"
  | "needs_review";

export type CustomerActivityType = "sales" | "rental" | "maintenance";

export type CustomerSort = "recent" | "name";
export type CustomerViewState = "normal" | "loading" | "empty" | "error" | "offline";

export interface Customer {
  id: string;
  /** Optional normalized aliases consumed by generic report rows. */
  phone?: string;
  preferredBranchId?: string;
  customerNumber: string;
  name: string;
  primaryPhone: string;
  alternatePhones: string[];
  branchIds: string[];
  createdAt: string;
  createdBy: string;
  lastActivityAt: string;
  totalSales: number;
  totalRentals: number;
  totalMaintenanceOrders: number;
  status: CustomerStatus;
  flags: CustomerFlag[];
  notesCount: number;
  activityTypes: CustomerActivityType[];
  assignedMaintenance: boolean;
  /** Soft deletion keeps old invoices and rentals readable while hiding the customer from new work. */
  deletedAt?: string | null;
  deletedByEmployeeId?: string | null;
}

export type CustomerDeleteRequestStatus = "pending" | "approved" | "rejected";

export interface CustomerDeleteRequest {
  id: string;
  customerId: string;
  customerName: string;
  branchId: string;
  reason: string;
  status: CustomerDeleteRequestStatus;
  requestedByEmployeeId: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedAt: string;
  reviewedByEmployeeId: string | null;
  reviewedAt: string | null;
  reviewerNote: string;
}

export interface CustomerActivityEvent {
  id: string;
  customerId: string;
  type: CustomerActivityType | "profile";
  title: string;
  description: string;
  reference: string;
  branchId: string;
  occurredAt: string;
  amount?: number;
}

export interface CustomerQuery {
  q: string;
  status: CustomerStatus | "all";
  flag: CustomerFlag | "all";
  activity: CustomerActivityType | "all";
  page: number;
  sort: CustomerSort;
}

export interface CustomerSummaryData {
  total: number;
  active: number;
  needsReview: number;
}

export interface CustomerFormValues {
  name: string;
  primaryPhone: string;
  alternatePhone: string;
  branchId: string;
  notes: string;
}

export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>>;

export interface CustomerFormValidation {
  valid: boolean;
  errors: CustomerFormErrors;
  duplicate?: Customer;
  normalizedValues: CustomerFormValues;
}

export interface CustomerAccess {
  canCreate: boolean;
  canEdit: boolean;
  canViewSales: boolean;
  canViewRentals: boolean;
  canViewMaintenance: boolean;
  canViewFullTimeline: boolean;
  canRequestDelete: boolean;
  canDeleteDirectly: boolean;
  canReviewDeleteRequests: boolean;
  allowedActivityTypes: CustomerActivityType[];
}
