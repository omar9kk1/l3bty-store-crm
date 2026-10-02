import type { Branch } from "@/features/branches/types";
import type { RentalAssetStatus } from "../types";

export const assetStatusLabels: Record<RentalAssetStatus, string> = {
  available: "متاح",
  selecting: "اختيار وتجربة",
  rented: "مؤجر",
  near_end: "اقترب الانتهاء",
  additional_time: "وقت إضافي",
  maintenance: "في الصيانة",
  in_transit: "قيد التحويل",
  out_of_service: "خارج الخدمة",
};

export const assetTone = (
  status: RentalAssetStatus,
): "success" | "warning" | "danger" | "info" | "neutral" =>
  status === "available"
    ? "success"
    : status === "maintenance" || status === "out_of_service"
      ? "danger"
      : status === "near_end" || status === "additional_time"
        ? "warning"
        : status === "selecting" || status === "in_transit"
          ? "info"
          : "neutral";

export const hours = (seconds: number) =>
  `${(seconds / 3600).toLocaleString("ar-EG-u-nu-latn", {
    maximumFractionDigits: 1,
  })} س`;

const locationSuffixLabels: Record<string, string> = {
  "rental-zone": "منطقة التأجير",
  "rental-zone-a": "منطقة التأجير أ",
  "rental-zone-b": "منطقة التأجير ب",
  storage: "المخزن",
  "bench-2": "منطقة الصيانة 2",
};

export function assetLocationLabel(
  locationId: string,
  branchId: string,
  branches: readonly Branch[],
) {
  if (locationId === "in_transit") return "قيد التحويل";
  if (locationId === "selection-zone") return "منطقة الاختيار";

  const exactBranch = branches.find((branch) => branch.id === locationId);
  if (exactBranch) return exactBranch.name;

  const locationBranch = [...branches]
    .sort((first, second) => second.id.length - first.id.length)
    .find((branch) => locationId.startsWith(`${branch.id}-`));
  if (locationBranch) {
    const suffix = locationId.slice(locationBranch.id.length + 1);
    const suffixLabel = locationSuffixLabels[suffix];
    return suffixLabel
      ? `${locationBranch.name} · ${suffixLabel}`
      : locationBranch.name;
  }

  return branches.find((branch) => branch.id === branchId)?.name ?? "غير محدد";
}
