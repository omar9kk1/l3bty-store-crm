import { describe, expect, it } from "vitest";
import { resolveWorkspaceBackTarget } from "@/components/shell/WorkspaceBackButton";

describe("WorkspaceBackButton rental hierarchy", () => {
  it("returns to the rental list instead of reopening the new-rental wizard", () => {
    expect(resolveWorkspaceBackTarget("/rentals/new")).toBe("/rentals");
    expect(resolveWorkspaceBackTarget("/rentals/rental-112")).toBe("/rentals");
  });

  it("returns rental operations to the matching rental details", () => {
    expect(resolveWorkspaceBackTarget("/rentals/rental-112/extend")).toBe("/rentals/rental-112");
    expect(resolveWorkspaceBackTarget("/rentals/rental-112/close")).toBe("/rentals/rental-112");
    expect(resolveWorkspaceBackTarget("/maintenance/orders/order-1")).toBeNull();
  });
});
