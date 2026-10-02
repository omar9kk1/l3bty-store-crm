import { describe, expect, it } from "vitest";
import {
  buildTransferLocationOptions,
  CENTRAL_WORKSHOP_LOCATION_ID,
  resolveTransferLocationName,
} from "../services/transfer-location-options";

describe("transfer location options", () => {
  it("maps a registered central workshop to the operational workshop destination", () => {
    const locations = buildTransferLocationOptions([
      {
        id: "branch-01",
        name: "مول غازي",
        type: "branch",
        status: "active",
      },
      {
        id: "branch-04",
        name: "الورشة المركزية الرئيسية",
        type: "central_workshop",
        status: "active",
      },
    ]);

    expect(locations).toContainEqual({
      id: CENTRAL_WORKSHOP_LOCATION_ID,
      name: "الورشة المركزية الرئيسية",
    });
    expect(locations.some((location) => location.id === "branch-04")).toBe(
      false,
    );
  });

  it("keeps the central workshop available when no workshop record exists yet", () => {
    expect(buildTransferLocationOptions([])).toEqual([
      {
        id: CENTRAL_WORKSHOP_LOCATION_ID,
        name: "الورشة المركزية",
      },
    ]);
  });

  it("shows registered Arabic location names instead of internal ids", () => {
    const locations = buildTransferLocationOptions([
      {
        id: "branch-01",
        name: "مول غازي",
        type: "branch",
        status: "active",
      },
      {
        id: "branch-04",
        name: "ورشة مركزية 1",
        type: "central_workshop",
        status: "active",
      },
    ]);

    expect(resolveTransferLocationName("branch-01", locations)).toBe(
      "مول غازي",
    );
    expect(resolveTransferLocationName("workshop", locations)).toBe(
      "ورشة مركزية 1",
    );
  });

  it("does not expose an unknown internal location id", () => {
    expect(resolveTransferLocationName("branch-missing", [])).toBe(
      "موقع غير معروف",
    );
  });
});
