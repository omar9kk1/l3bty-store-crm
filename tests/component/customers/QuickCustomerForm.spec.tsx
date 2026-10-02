import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickCustomerForm } from "@/features/customers/forms/QuickCustomerForm";

const branches = [
  { id: "branch-1", nameAr: "مول غازي", code: "BR01", type: "branch" as const, status: "active" as const },
  { id: "branch-2", nameAr: "فرع آخر", code: "BR02", type: "branch" as const, status: "active" as const },
];

describe("QuickCustomerForm", () => {
  it("keeps rental quick customer entry to name and phone only", () => {
    render(<QuickCustomerForm customers={[]} branches={branches} fixedBranchId="branch-2" essentialFieldsOnly onSave={vi.fn()} />);

    expect(screen.getByLabelText(/اسم العميل/)).toBeVisible();
    expect(screen.getByLabelText(/رقم الهاتف الأساسي/)).toBeVisible();
    expect(screen.queryByLabelText(/رقم بديل/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^الفرع/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ملاحظات مختصرة/)).not.toBeInTheDocument();
  });

  it("saves the employee branch automatically with safe empty optional values", () => {
    const onSave = vi.fn();
    render(<QuickCustomerForm customers={[]} branches={branches} fixedBranchId="branch-2" essentialFieldsOnly onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/اسم العميل/), { target: { value: "عميل اختبار" } });
    fireEvent.change(screen.getByLabelText(/رقم الهاتف الأساسي/), { target: { value: "01012345678" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ العميل" }));

    expect(onSave).toHaveBeenCalledWith({
      name: "عميل اختبار",
      primaryPhone: "01012345678",
      alternatePhone: "",
      branchId: "branch-2",
      notes: "",
    });
  });
});
