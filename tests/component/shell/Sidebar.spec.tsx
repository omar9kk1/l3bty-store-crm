import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "@/components/shell/Sidebar";
import { filterNavigation } from "@/permissions/navigation-policy";
import { resolvePermissions } from "@/permissions/resolve-permissions";

describe("Sidebar", () => {
  it("renders only navigation allowed for the selected role", () => {
    const navigation = filterNavigation(resolvePermissions(["sales_employee"]));
    render(<Sidebar navigation={navigation} pathname="/sales/pos" collapsed={false} mode="drawer" />);

    expect(screen.getByRole("link", { name: "نقطة البيع" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "التأجير" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "الفروع والمواقع" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "الإعدادات" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "سجل النشاط" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "الموظفون" })).not.toBeInTheDocument();
  });

  it("opens only the current section so the full sidebar fits without scrolling", () => {
    const navigation = filterNavigation(resolvePermissions(["owner"]));
    const payrollSection = navigation.find((item) => item.key === "payroll")!.section;
    const operationsSection = navigation.find((item) => item.key === "operations")!.section;
    render(<Sidebar navigation={navigation} pathname="/payroll/payroll-307" collapsed={false} />);

    expect(screen.getByRole("button", { name: payrollSection })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: operationsSection })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: operationsSection }));
    expect(screen.getByRole("button", { name: operationsSection })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: payrollSection })).toHaveAttribute("aria-expanded", "false");
  });
});
