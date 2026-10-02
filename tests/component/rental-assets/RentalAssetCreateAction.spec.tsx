import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Branch } from "@/features/branches/types";
import { RentalAssetCreateAction } from "@/features/rental-assets/components/RentalAssetCreateAction";
import { createRentalAsset } from "@/features/rentals/services/rental-store";

vi.mock("@/features/rentals/services/rental-store", () => ({
  createRentalAsset: vi.fn(() => ({ valid: true, message: "تم الحفظ" })),
}));

const branch = {
  id: "branch-1",
  code: "BR01",
  name: "مول غازي",
  type: "branch",
  status: "active",
} as Branch;

describe("RentalAssetCreateAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the rental asset form focused on the essential fields", () => {
    render(<RentalAssetCreateAction branches={[branch]} />);
    fireEvent.click(screen.getByRole("button", { name: "إضافة لعبة تأجير" }));

    expect(screen.getByRole("dialog", { name: "إضافة لعبة تأجير" })).toBeVisible();
    expect(screen.getByLabelText("رقم اللعبة (الباركود)")).toBeRequired();
    expect(screen.queryByLabelText("رقم الأصل")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("تاريخ الشراء")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("تكلفة الشراء")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ملاحظات")).not.toBeInTheDocument();
  });

  it("saves safe empty defaults for the removed fields", () => {
    render(<RentalAssetCreateAction branches={[branch]} />);
    fireEvent.click(screen.getByRole("button", { name: "إضافة لعبة تأجير" }));
    fireEvent.change(screen.getByLabelText("اسم اللعبة"), { target: { value: "سكوتر اختبار" } });
    fireEvent.change(screen.getByLabelText("رقم اللعبة (الباركود)"), { target: { value: "GAME-1001" } });
    fireEvent.change(screen.getByLabelText("الفرع"), { target: { value: "branch-1" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ اللعبة" }));

    expect(createRentalAsset).toHaveBeenCalledWith(expect.objectContaining({
      assetNumber: "GAME-1001",
      barcode: "GAME-1001",
      purchaseDate: "",
      purchaseCost: 0,
      notes: "",
    }));
  });

  it("keeps the action in one stable container and hides feedback after five seconds", () => {
    vi.useFakeTimers();
    render(<RentalAssetCreateAction branches={[branch]} />);
    const action = screen.getByRole("button", { name: "إضافة لعبة تأجير" });
    expect(action.parentElement).toHaveClass("rental-asset-create-action");

    fireEvent.click(action);
    fireEvent.change(screen.getByLabelText("اسم اللعبة"), {
      target: { value: "لعبة مؤقتة" },
    });
    fireEvent.change(screen.getByLabelText("رقم اللعبة (الباركود)"), {
      target: { value: "TEMP-1" },
    });
    fireEvent.change(screen.getByLabelText("الفرع"), {
      target: { value: "branch-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "حفظ اللعبة" }));

    expect(screen.getByRole("status")).toHaveTextContent("تم الحفظ");
    act(() => vi.advanceTimersByTime(4_999));
    expect(screen.getByRole("status")).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
