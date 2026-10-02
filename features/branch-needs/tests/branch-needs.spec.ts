import { beforeEach, describe, expect, it } from "vitest";
import { branchNeedBranchLabel } from "../components/branch-needs-labels";
import {
  completeBranchNeedFromTransfer,
  createBranchNeed,
  getBranchNeedsSnapshot,
  linkBranchNeedToTransfer,
  resetBranchNeedsStore,
  reviewBranchNeed,
} from "../services/branch-needs-store";

describe("branch needs requests", () => {
  beforeEach(() => resetBranchNeedsStore());

  it("does not expose an internal branch id when the branch is missing", () => {
    expect(branchNeedBranchLabel("مول غازي")).toBe("مول غازي");
    expect(branchNeedBranchLabel()).toBe("فرع غير معروف");
  });

  it("creates a request without changing inventory or requiring a source branch", () => {
    const result = createBranchNeed({
      kind: "rental_game",
      branchId: "branch-1",
      requestedByEmployeeId: "employee-rental",
      itemName: "سكوتر كهربائي",
      quantity: 2,
      priority: "urgent",
      reason: "الطلب عليه مرتفع",
    });
    expect(result.valid).toBe(true);
    expect(getBranchNeedsSnapshot().requests[0]).toMatchObject({
      status: "pending",
      itemName: "سكوتر كهربائي",
      quantity: 2,
    });
  });

  it("requires clear request details", () => {
    const result = createBranchNeed({
      kind: "sales_item",
      branchId: "all",
      requestedByEmployeeId: "",
      itemName: "",
      quantity: 0,
      priority: "normal",
      reason: "",
    });
    expect(result.valid).toBe(false);
    expect(getBranchNeedsSnapshot().requests).toHaveLength(0);
  });

  it("fulfills an approved request only through its linked transfer", () => {
    const created = createBranchNeed({
      kind: "sales_item",
      branchId: "branch-1",
      requestedByEmployeeId: "employee-sales",
      itemName: "لعبة ريموت",
      quantity: 3,
      priority: "normal",
      reason: "نفدت من الفرع",
    });
    expect(
      linkBranchNeedToTransfer(created.request!.id, "transfer-1").valid,
    ).toBe(false);
    expect(
      reviewBranchNeed(created.request!.id, "approved", "manager", "").valid,
    ).toBe(true);
    expect(
      linkBranchNeedToTransfer(created.request!.id, "transfer-1").valid,
    ).toBe(true);
    expect(
      linkBranchNeedToTransfer(created.request!.id, "transfer-2").valid,
    ).toBe(false);
    expect(
      completeBranchNeedFromTransfer(created.request!.id, "transfer-2").valid,
    ).toBe(false);
    expect(
      completeBranchNeedFromTransfer(created.request!.id, "transfer-1").valid,
    ).toBe(true);
    expect(getBranchNeedsSnapshot().requests[0].status).toBe("fulfilled");
  });
});
