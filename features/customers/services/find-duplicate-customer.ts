import type { Customer } from "../types";
import { normalizePhone } from "./normalize-phone";

export function findDuplicateCustomer(
  phone: string,
  customers: readonly Customer[],
  excludedCustomerId?: string,
) {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;

  return customers.find((customer) => {
    if (customer.id === excludedCustomerId) return false;
    return [customer.primaryPhone, ...customer.alternatePhones]
      .map(normalizePhone)
      .includes(normalized);
  });
}
