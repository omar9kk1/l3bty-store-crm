import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer, type DrawerVariant } from "@/components/ui/Drawer";

describe("Drawer directional contract", () => {
  it.each<DrawerVariant>(["auxiliary", "navigation", "bottom-sheet"])(
    "renders the %s variant explicitly with RTL content",
    (variant) => {
      const { unmount } = render(
        <Drawer
          open
          onOpenChange={vi.fn()}
          title={`لوحة ${variant}`}
          description="محتوى عربي"
          variant={variant}
        >
          <button type="button">إجراء</button>
        </Drawer>,
      );

      const drawer = screen.getByRole("dialog", { name: `لوحة ${variant}` });
      expect(drawer).toHaveAttribute("data-drawer-variant", variant);
      expect(drawer).toHaveAttribute("dir", "rtl");
      expect(drawer).toHaveClass(`ui-drawer--${variant}`);
      unmount();
    },
  );
});
