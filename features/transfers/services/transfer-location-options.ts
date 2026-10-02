import type { Branch } from "@/features/branches/types";

export const CENTRAL_WORKSHOP_LOCATION_ID = "workshop";

type TransferLocationBranch = Pick<
  Branch,
  "id" | "name" | "type" | "status"
>;

export interface TransferLocationOption {
  id: string;
  name: string;
}

export function buildTransferLocationOptions(
  branches: readonly TransferLocationBranch[],
): TransferLocationOption[] {
  const activeLocations = branches.filter(
    (branch) => branch.status !== "inactive",
  );
  const centralWorkshop = activeLocations.find(
    (branch) => branch.type === "central_workshop",
  );

  return [
    ...activeLocations
      .filter((branch) => branch.type !== "central_workshop")
      .map((branch) => ({ id: branch.id, name: branch.name })),
    {
      id: CENTRAL_WORKSHOP_LOCATION_ID,
      name: centralWorkshop?.name || "الورشة المركزية",
    },
  ];
}

export function resolveTransferLocationName(
  locationId: string,
  locations: readonly TransferLocationOption[],
): string {
  return (
    locations.find((location) => location.id === locationId)?.name ??
    (locationId === CENTRAL_WORKSHOP_LOCATION_ID
      ? "الورشة المركزية"
      : "موقع غير معروف")
  );
}
