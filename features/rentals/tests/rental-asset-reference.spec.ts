import { describe, expect, it } from "vitest";

import { rentalAssetReference } from "../components/rental-asset-reference";

describe("rentalAssetReference", () => {
  it("uses a readable fallback instead of an internal id", () => {
    expect(rentalAssetReference("GAME-01", "AST-0001")).toBe("GAME-01");
    expect(rentalAssetReference(undefined, "AST-0001")).toBe("AST-0001");
    expect(rentalAssetReference()).toBe("غير متاح");
  });
});
