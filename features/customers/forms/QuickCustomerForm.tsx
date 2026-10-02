"use client";

import type { BranchOption } from "@/features/branches/types";
import type { Customer, CustomerFormValues } from "../types";
import { CustomerForm } from "./CustomerForm";

interface QuickCustomerFormProps {
  customers: readonly Customer[];
  branches: readonly BranchOption[];
  offline?: boolean;
  fixedBranchId?: string;
  essentialFieldsOnly?: boolean;
  onSave: (values: CustomerFormValues) => void;
}

export function QuickCustomerForm({ customers, branches, offline, fixedBranchId, essentialFieldsOnly, onSave }: QuickCustomerFormProps) {
  return (
    <CustomerForm
      customers={customers}
      branches={branches}
      offline={offline}
      fixedBranchId={fixedBranchId}
      essentialFieldsOnly={essentialFieldsOnly}
      submitLabel="حفظ العميل"
      onSave={onSave}
    />
  );
}
