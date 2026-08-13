"use client";

import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { CloseRentalForm } from "../forms/CloseRentalForm";
import { ExtendRentalForm } from "../forms/ExtendRentalForm";
import { useRentals } from "../hooks/use-rentals";
import { canAccessRentalBranch, canManageRentals } from "../permissions";

export function RentalOperationPage({ rentalId, mode }: { rentalId: string; mode: "extend" | "close" }) {
  const { roles, permissions, availableBranches } = useShell();
  const { rentals } = useRentals();
  const rental = rentals.find((item) => item.id === rentalId);
  const allowed = rental && canAccessRentalBranch(roles, rental.branchId, availableBranches.map((item) => item.id));
  if (!permissions.has(PERMISSION_KEYS.rentals) || !canManageRentals(roles) || !allowed) return <PermissionDeniedState />;
  return <div className="rentals-page">{mode === "extend" ? <ExtendRentalForm rentalId={rentalId} /> : <CloseRentalForm rentalId={rentalId} />}</div>;
}
