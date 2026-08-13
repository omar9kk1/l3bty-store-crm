import { CUSTOMER_FIXTURES } from "../fixtures";
import type { Customer, CustomerFormValues } from "../types";

let customers: readonly Customer[] = CUSTOMER_FIXTURES.map((customer) => ({ ...customer, phone: customer.primaryPhone, preferredBranchId: customer.branchIds[0] ?? "" }));
let nextSequence = CUSTOMER_FIXTURES.length + 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeCustomers(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCustomersSnapshot(): readonly (Customer & { phone: string; preferredBranchId: string })[] {
  return customers as readonly (Customer & { phone: string; preferredBranchId: string })[];
}

export function createCustomer(values: CustomerFormValues): Customer {
  const sequence = nextSequence++;
  const customer: Customer = {
    id: `customer-${String(sequence).padStart(3, "0")}`,
    phone: values.primaryPhone,
    preferredBranchId: values.branchId,
    customerNumber: `CUS-2026-${String(sequence).padStart(4, "0")}`,
    name: values.name,
    primaryPhone: values.primaryPhone,
    alternatePhones: values.alternatePhone ? [values.alternatePhone] : [],
    branchIds: [values.branchId],
    createdAt: "2026-08-05T14:00:00+03:00",
    createdBy: "المستخدم الحالي — تجريبي",
    lastActivityAt: "2026-08-05T14:00:00+03:00",
    totalSales: 0,
    totalRentals: 0,
    totalMaintenanceOrders: 0,
    outstandingBalance: 0,
    status: "active",
    flags: [],
    notesCount: values.notes ? 1 : 0,
    activityTypes: [],
    assignedMaintenance: false,
  };
  customers = [customer, ...customers];
  emit();
  return customer;
}

export function updateCustomer(customerId: string, values: CustomerFormValues) {
  let updated: Customer | undefined;
  customers = customers.map((customer) => {
    if (customer.id !== customerId) return customer;
    updated = {
      ...customer,
      name: values.name,
      primaryPhone: values.primaryPhone,
      phone: values.primaryPhone,
      preferredBranchId: values.branchId,
      alternatePhones: values.alternatePhone ? [values.alternatePhone] : [],
      branchIds: [values.branchId],
      notesCount: customer.notesCount + (values.notes ? 1 : 0),
    };
    return updated;
  });
  if (updated) emit();
  return updated;
}

export function resetCustomerStore() {
  customers = CUSTOMER_FIXTURES.map((customer) => ({ ...customer, phone: customer.primaryPhone, preferredBranchId: customer.branchIds[0] ?? "" }));
  nextSequence = CUSTOMER_FIXTURES.length + 1;
  emit();
}
