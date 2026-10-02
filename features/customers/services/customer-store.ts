import { CUSTOMER_FIXTURES } from "../fixtures";
import { readLocalTestData, removeLocalTestData, writeLocalTestData } from "@/lib/local-test-data";
import { markNotificationActedByReference, publishNotification } from "@/features/notifications/services/notification-service";
import type { Customer, CustomerActivityType, CustomerDeleteRequest, CustomerFlag, CustomerFormValues } from "../types";
import type { RoleId } from "@/permissions/types";

const STORAGE_KEY = "l3bty-local-customers-v1";
const STORAGE_VERSION = 1;
const RENTAL_STORAGE_KEY = "l3bty-rental-store-v1";

type StoredCustomers = { customers: Customer[]; nextSequence: number; deleteRequests?: CustomerDeleteRequest[]; nextDeleteRequestSequence?: number };
type StoredRentalLink = { customerId?: string; branchId?: string; startedAt?: string | null; closedAt?: string | null };

let customers: readonly Customer[] = [];
let nextSequence = 1;
let deleteRequests: readonly CustomerDeleteRequest[] = [];
let nextDeleteRequestSequence = 1;
let hydrated = false;
const listeners = new Set<() => void>();

function normalizeCustomer(customer: Customer): Customer {
  const legacy = customer as Omit<Customer, "flags"> & { outstandingBalance?: number; flags: (CustomerFlag | "debt")[] };
  const current = { ...legacy };
  delete current.outstandingBalance;
  return {
    ...current,
    phone: customer.primaryPhone,
    preferredBranchId: customer.branchIds[0] ?? "",
    alternatePhones: [...customer.alternatePhones],
    branchIds: [...customer.branchIds],
    flags: legacy.flags.filter((flag): flag is CustomerFlag => flag !== "debt"),
    activityTypes: [...customer.activityTypes],
  };
}

function readRentalLinks() {
  if (typeof window === "undefined") return [] as StoredRentalLink[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RENTAL_STORAGE_KEY) ?? "null") as { rentals?: StoredRentalLink[] } | null;
    return Array.isArray(parsed?.rentals) ? parsed.rentals : [];
  } catch {
    return [] as StoredRentalLink[];
  }
}

function restoreRentalCustomerLinks(items: readonly Customer[]) {
  const linksByCustomer = new Map<string, StoredRentalLink[]>();
  for (const rental of readRentalLinks()) {
    if (!rental.customerId) continue;
    linksByCustomer.set(rental.customerId, [...(linksByCustomer.get(rental.customerId) ?? []), rental]);
  }
  let changed = false;
  const restored = items.map((customer) => {
    const links = linksByCustomer.get(customer.id) ?? [];
    if (!links.length) return customer;
    const activityTypes = customer.activityTypes.includes("rental") ? customer.activityTypes : [...customer.activityTypes, "rental" as const];
    const branchIds = [...new Set([...customer.branchIds, ...links.map((link) => link.branchId).filter((id): id is string => Boolean(id))])];
    const latestActivity = links.map((link) => link.closedAt ?? link.startedAt).filter((at): at is string => Boolean(at)).sort().at(-1);
    const totalRentals = Math.max(customer.totalRentals, links.length);
    if (activityTypes !== customer.activityTypes || branchIds.length !== customer.branchIds.length || totalRentals !== customer.totalRentals || (latestActivity && latestActivity > customer.lastActivityAt)) changed = true;
    return normalizeCustomer({
      ...customer,
      activityTypes: [...activityTypes],
      branchIds,
      preferredBranchId: customer.preferredBranchId || branchIds[0] || "",
      totalRentals,
      lastActivityAt: latestActivity && latestActivity > customer.lastActivityAt ? latestActivity : customer.lastActivityAt,
    });
  });
  return { restored, changed };
}

export function hydrateCustomerStore() {
  if (hydrated || typeof window === "undefined") return false;
  hydrated = true;
  const stored = readLocalTestData<StoredCustomers>(STORAGE_KEY, STORAGE_VERSION, { customers: [], nextSequence: 1 });
  const hasRetiredDebtData = stored.customers.some((customer) => "outstandingBalance" in customer || (customer.flags as string[]).includes("debt"));
  const migrated = restoreRentalCustomerLinks(stored.customers.map(normalizeCustomer));
  customers = migrated.restored;
  nextSequence = stored.nextSequence;
  deleteRequests = stored.deleteRequests ?? [];
  nextDeleteRequestSequence = stored.nextDeleteRequestSequence ?? 1;
  if (migrated.changed || hasRetiredDebtData) writeLocalTestData(STORAGE_KEY, STORAGE_VERSION, { customers, nextSequence, deleteRequests, nextDeleteRequestSequence });
  return true;
}

function emit() {
  writeLocalTestData(STORAGE_KEY, STORAGE_VERSION, { customers, nextSequence, deleteRequests, nextDeleteRequestSequence });
  listeners.forEach((listener) => listener());
}

export function subscribeCustomers(listener: () => void) {
  hydrateCustomerStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCustomersSnapshot(): readonly (Customer & { phone: string; preferredBranchId: string })[] {
  hydrateCustomerStore();
  return customers as readonly (Customer & { phone: string; preferredBranchId: string })[];
}

export function getCustomerDeleteRequestsSnapshot(): readonly CustomerDeleteRequest[] {
  hydrateCustomerStore();
  return deleteRequests;
}

export function requestCustomerDeletion(customerId: string, input: { requestedByEmployeeId: string; requestedByUserId: string; requestedByName: string; branchId: string; reason: string }) {
  hydrateCustomerStore();
  const customer = customers.find((item) => item.id === customerId);
  if (!customer || customer.deletedAt) return { valid: false, message: "العميل غير متاح للحذف." } as const;
  const reason = input.reason.trim();
  if (!reason) return { valid: false, message: "اكتب سبب طلب الحذف." } as const;
  const existing = deleteRequests.find((item) => item.customerId === customerId && item.status === "pending");
  if (existing) return { valid: false, message: "يوجد طلب حذف لهذا العميل ينتظر مراجعة المدير.", request: existing } as const;
  const now = new Date().toISOString();
  const request: CustomerDeleteRequest = {
    id: `customer-delete-${String(nextDeleteRequestSequence++).padStart(4, "0")}`,
    customerId,
    customerName: customer.name,
    branchId: input.branchId || customer.branchIds[0] || "all",
    reason,
    status: "pending",
    requestedByEmployeeId: input.requestedByEmployeeId,
    requestedByUserId: input.requestedByUserId,
    requestedByName: input.requestedByName,
    requestedAt: now,
    reviewedByEmployeeId: null,
    reviewedAt: null,
    reviewerNote: "",
  };
  deleteRequests = [request, ...deleteRequests];
  publishNotification({
    recipientUserId: "user-manager", recipientEmployeeId: "employee-manager", type: "customer_delete_requested", category: "customer", priority: "high",
    title: "طلب حذف عميل ينتظر موافقتك", body: `${input.requestedByName} طلب حذف العميل ${customer.name}.`, branchId: request.branchId,
    referenceType: "customer_delete_request", referenceId: request.id, deepLink: `/customers?deleteRequest=${request.id}`, createdAt: now, expiresAt: null,
    idempotencyKey: `customer-delete:${request.id}:requested`, metadata: { customerId, requestedByEmployeeId: input.requestedByEmployeeId },
  });
  emit();
  return { valid: true, message: "تم إرسال طلب الحذف للمدير للموافقة.", request } as const;
}

export function reviewCustomerDeletion(requestId: string, decision: "approved" | "rejected", input: { reviewerEmployeeId: string; reviewerRole: RoleId; note: string }) {
  hydrateCustomerStore();
  if (input.reviewerRole !== "manager") return { valid: false, message: "موافقة حذف العميل متاحة للمدير فقط." } as const;
  const request = deleteRequests.find((item) => item.id === requestId);
  if (!request || request.status !== "pending") return { valid: false, message: "طلب الحذف غير متاح أو تمت مراجعته بالفعل." } as const;
  const now = new Date().toISOString();
  deleteRequests = deleteRequests.map((item) => item.id === requestId ? { ...item, status: decision, reviewedByEmployeeId: input.reviewerEmployeeId, reviewedAt: now, reviewerNote: input.note.trim() } : item);
  if (decision === "approved") customers = customers.map((customer) => customer.id === request.customerId ? { ...customer, deletedAt: now, deletedByEmployeeId: input.reviewerEmployeeId } : customer);
  markNotificationActedByReference("customer_delete_request", request.id, "user-manager");
  publishNotification({
    recipientUserId: request.requestedByUserId, recipientEmployeeId: request.requestedByEmployeeId, type: `customer_delete_${decision}`, category: "customer", priority: "normal",
    title: decision === "approved" ? "تمت الموافقة على حذف العميل" : "تم رفض طلب حذف العميل",
    body: decision === "approved" ? `وافق المدير على حذف العميل ${request.customerName}.` : `رفض المدير حذف العميل ${request.customerName}${input.note.trim() ? `: ${input.note.trim()}` : "."}`,
    branchId: request.branchId, referenceType: "customer_delete_request", referenceId: request.id, deepLink: "/customers", createdAt: now, expiresAt: null,
    idempotencyKey: `customer-delete:${request.id}:${decision}`, metadata: { customerId: request.customerId },
  });
  emit();
  return { valid: true, message: decision === "approved" ? "تمت الموافقة وحُذف العميل من القوائم الجديدة." : "تم رفض طلب الحذف.", request: deleteRequests.find((item) => item.id === requestId)! } as const;
}

export function deleteCustomerDirectly(customerId: string, input: { actorEmployeeId: string; actorRole: RoleId; reason: string }) {
  hydrateCustomerStore();
  if (!(["owner", "manager"] as RoleId[]).includes(input.actorRole)) return { valid: false, message: "لا تملك صلاحية حذف العميل مباشرة." } as const;
  const customer = customers.find((item) => item.id === customerId);
  if (!customer || customer.deletedAt) return { valid: false, message: "العميل غير متاح للحذف." } as const;
  if (!input.reason.trim()) return { valid: false, message: "اكتب سبب الحذف." } as const;
  const pending = deleteRequests.find((item) => item.customerId === customerId && item.status === "pending");
  if (pending) {
    if (input.actorRole !== "manager") return { valid: false, message: "يوجد طلب حذف ينتظر مراجعة المدير." } as const;
    return reviewCustomerDeletion(pending.id, "approved", { reviewerEmployeeId: input.actorEmployeeId, reviewerRole: "manager", note: input.reason });
  }
  const now = new Date().toISOString();
  customers = customers.map((item) => item.id === customerId ? { ...item, deletedAt: now, deletedByEmployeeId: input.actorEmployeeId } : item);
  emit();
  return { valid: true, message: "تم حذف العميل من القوائم الجديدة مع الاحتفاظ بسجلاته القديمة." } as const;
}

export function createCustomer(values: CustomerFormValues, activityType?: CustomerActivityType): Customer {
  hydrateCustomerStore();
  const sequence = nextSequence++;
  const now = new Date().toISOString();
  const customer: Customer = {
    id: `customer-${String(sequence).padStart(3, "0")}`,
    phone: values.primaryPhone,
    preferredBranchId: values.branchId,
    customerNumber: `CUS-2026-${String(sequence).padStart(4, "0")}`,
    name: values.name,
    primaryPhone: values.primaryPhone,
    alternatePhones: values.alternatePhone ? [values.alternatePhone] : [],
    branchIds: [values.branchId],
    createdAt: now,
    createdBy: "المستخدم الحالي",
    lastActivityAt: now,
    totalSales: 0,
    totalRentals: 0,
    totalMaintenanceOrders: 0,
    status: "active",
    flags: [],
    notesCount: values.notes ? 1 : 0,
    activityTypes: activityType ? [activityType] : [],
    assignedMaintenance: false,
  };
  customers = [customer, ...customers];
  emit();
  return customer;
}

export function registerCustomerActivity(customerId: string, activityType: CustomerActivityType, branchId: string, occurredAt = new Date().toISOString()) {
  hydrateCustomerStore();
  let updated = false;
  customers = customers.map((customer) => {
    if (customer.id !== customerId) return customer;
    updated = true;
    const activityTypes = customer.activityTypes.includes(activityType) ? customer.activityTypes : [...customer.activityTypes, activityType];
    const branchIds = customer.branchIds.includes(branchId) ? customer.branchIds : [...customer.branchIds, branchId];
    return normalizeCustomer({
      ...customer,
      activityTypes: [...activityTypes],
      branchIds: [...branchIds],
      preferredBranchId: customer.preferredBranchId || branchId,
      lastActivityAt: occurredAt > customer.lastActivityAt ? occurredAt : customer.lastActivityAt,
      totalRentals: activityType === "rental" ? customer.totalRentals + 1 : customer.totalRentals,
      totalSales: activityType === "sales" ? customer.totalSales + 1 : customer.totalSales,
      totalMaintenanceOrders: activityType === "maintenance" ? customer.totalMaintenanceOrders + 1 : customer.totalMaintenanceOrders,
    });
  });
  if (updated) emit();
  return updated;
}

export function updateCustomer(customerId: string, values: CustomerFormValues) {
  hydrateCustomerStore();
  let updated: Customer | undefined;
  customers = customers.map((customer) => {
    if (customer.id !== customerId) return customer;
    updated = normalizeCustomer({
      ...customer,
      name: values.name,
      primaryPhone: values.primaryPhone,
      phone: values.primaryPhone,
      preferredBranchId: values.branchId,
      alternatePhones: values.alternatePhone ? [values.alternatePhone] : [],
      branchIds: [values.branchId],
      notesCount: customer.notesCount + (values.notes ? 1 : 0),
    });
    return updated;
  });
  if (updated) emit();
  return updated;
}

export function resetCustomerStore() {
  hydrated = true;
  customers = CUSTOMER_FIXTURES.map(normalizeCustomer);
  nextSequence = CUSTOMER_FIXTURES.length + 1;
  deleteRequests = [];
  nextDeleteRequestSequence = 1;
  removeLocalTestData(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}
