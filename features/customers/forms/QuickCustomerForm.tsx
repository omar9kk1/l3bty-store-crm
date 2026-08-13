"use client";

import type { BranchOption } from "@/features/branches/types";
import type { Customer, CustomerFormValues } from "../types";
import { CustomerForm } from "./CustomerForm";

export function QuickCustomerForm({ customers, branches, offline, onSave }: { customers: readonly Customer[]; branches: readonly BranchOption[]; offline?: boolean; onSave: (values: CustomerFormValues) => void }) {
  return <CustomerForm customers={customers} branches={branches} offline={offline} submitLabel="حفظ العميل" onSave={onSave} />;
}
