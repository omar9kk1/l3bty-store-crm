"use client";

import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { Card } from "@/components/ui/Card";
import { CloseRentalForm } from "../forms/CloseRentalForm";
import { ExtendRentalForm } from "../forms/ExtendRentalForm";
import { useRentals } from "../hooks/use-rentals";
import { canAccessRentalBranch, canOperateRentals } from "../permissions";

export function RentalOperationPage({ rentalId, mode }: { rentalId: string; mode: "extend" | "close" }) {
  const { roles, permissions, availableBranches } = useShell();
  const { rentals } = useRentals();
  const rental = rentals.find((item) => item.id === rentalId);
  const allowed = rental && canAccessRentalBranch(roles, rental.branchId, availableBranches.map((item) => item.id));
  if (!permissions.has(PERMISSION_KEYS.rentals) || !canOperateRentals(roles) || !allowed) return <PermissionDeniedState />;
  if (mode === "extend" && rental.durationType === "open_time") return <Card className="rental-state"><h2>الوقت المفتوح لا يحتاج تمديدًا</h2><p>يستمر العداد حتى إنهاء التأجير.</p></Card>;
  return <div className="rentals-page">{mode === "extend" ? <ExtendRentalForm rentalId={rentalId} /> : <CloseRentalForm rentalId={rentalId} />}</div>;
}
