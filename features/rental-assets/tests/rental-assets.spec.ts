import { describe, expect, it } from "vitest";
import { RENTAL_ASSET_FIXTURES } from "../fixtures";
import { canOperateRentalAssets, canViewRentalAssets, isTechnicianAssetView } from "../permissions";

describe("rental asset permissions and fixtures", () => {
  it("treats every asset as an individual serialized entity", () => {
    expect(new Set(RENTAL_ASSET_FIXTURES.map((asset) => asset.assetNumber)).size).toBe(RENTAL_ASSET_FIXTURES.length);
  });

  it.each(["owner", "manager", "rental_maintenance_employee"] as const)("allows %s to view rental assets", (role) => {
    expect(canViewRentalAssets([role])).toBe(true);
  });

  it("denies the maintenance technician because assets are available through maintenance orders", () => {
    expect(canViewRentalAssets(["maintenance_technician"])).toBe(false);
    expect(canOperateRentalAssets(["maintenance_technician"])).toBe(false);
    expect(isTechnicianAssetView(["maintenance_technician"])).toBe(false);
  });

  it("keeps full rental-asset access for an explicit rental and technician multi-role user", () => {
    const roles = ["maintenance_technician", "rental_maintenance_employee"] as const;
    expect(canViewRentalAssets(roles)).toBe(true);
    expect(canOperateRentalAssets(roles)).toBe(true);
  });

  it("denies sales-only users", () => {
    expect(canViewRentalAssets(["sales_employee"])).toBe(false);
  });

  it("provides available demo assets in branch 2", () => {
    const available = RENTAL_ASSET_FIXTURES.filter((asset) => asset.branchId === "branch-2" && asset.status === "available");
    expect(available).toHaveLength(4);
    expect(new Set(available.map((asset) => asset.barcode)).size).toBe(4);
  });
});
