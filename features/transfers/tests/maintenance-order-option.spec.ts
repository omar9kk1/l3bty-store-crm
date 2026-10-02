import { describe, expect, it } from "vitest";
import {
  formatMaintenanceOrderOption,
  formatTransferRoute,
} from "../forms/maintenance-order-option";

describe("formatMaintenanceOrderOption", () => {
  it("shows the order, game and Arabic status without leaking the internal value", () => {
    const label = formatMaintenanceOrderOption(
      { orderNumber: "MNT-2026-0115", status: "in_repair" },
      "سيارة كهربائية",
    );

    expect(label).toBe("MNT-2026-0115 — سيارة كهربائية — قيد الإصلاح");
    expect(label).not.toContain("in_repair");
  });

  it("keeps the label useful when the linked game name is unavailable", () => {
    expect(
      formatMaintenanceOrderOption({
        orderNumber: "MNT-2026-0115",
        status: "quality_check",
      }),
    ).toBe("MNT-2026-0115 — فحص الجودة");
  });

  it("shows readable location names in the final route review", () => {
    const names: Record<string, string> = {
      "branch-01": "مول غازي",
      workshop: "الورشة المركزية",
    };

    expect(
      formatTransferRoute(
        "branch-01",
        "workshop",
        (locationId) => names[locationId] ?? locationId,
      ),
    ).toBe("من مول غازي إلى الورشة المركزية");
  });
});
