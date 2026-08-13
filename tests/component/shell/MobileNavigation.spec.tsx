import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileNavigation } from "@/components/shell/MobileNavigation";
import { filterNavigation } from "@/permissions/navigation-policy";
import { resolvePermissions } from "@/permissions/resolve-permissions";

describe("MobileNavigation", () => {
  it("keeps at most five visible destinations including more", () => {
    const navigation = filterNavigation(resolvePermissions(["owner"]));
    render(<MobileNavigation navigation={navigation} pathname="/operations" onOpenMore={vi.fn()} />);
    expect(screen.getByTestId("mobile-navigation").children).toHaveLength(5);
    expect(screen.getByRole("link", { name: "مركز العمليات" })).toHaveAttribute("aria-current", "page");
  });

  it("uses the same permission-filtered navigation", () => {
    const navigation = filterNavigation(resolvePermissions(["sales_employee"]));
    render(<MobileNavigation navigation={navigation} pathname="/sales/pos" onOpenMore={vi.fn()} />);
    expect(screen.getByRole("link", { name: "نقطة البيع" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "التأجير" })).not.toBeInTheDocument();
    expect(navigation.map((item) => item.href)).not.toContain("/branches");
  });
});
