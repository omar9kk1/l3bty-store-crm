import { describe, expect, it } from "vitest";
import type { Branch } from "@/features/branches/types";
import { assetLocationLabel } from "@/features/rental-assets/components/asset-labels";

const branches = [
  { id: "branch-01", name: "مول غازي" },
  { id: "workshop", name: "الورشة المركزية" },
] as Branch[];

describe("rental asset location labels", () => {
  it("shows the branch name instead of its internal id", () => {
    expect(assetLocationLabel("branch-01", "branch-01", branches)).toBe(
      "مول غازي",
    );
  });

  it("translates common internal locations into readable names", () => {
    expect(
      assetLocationLabel("branch-01-rental-zone-a", "branch-01", branches),
    ).toBe("مول غازي · منطقة التأجير أ");
    expect(assetLocationLabel("workshop-bench-2", "workshop", branches)).toBe(
      "الورشة المركزية · منطقة الصيانة 2",
    );
    expect(assetLocationLabel("in_transit", "branch-01", branches)).toBe(
      "قيد التحويل",
    );
  });
});
