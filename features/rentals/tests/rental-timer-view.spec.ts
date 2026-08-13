import { describe, expect, it } from "vitest";
import { RENTAL_FIXTURES } from "../fixtures";
import { getRentalTimerView } from "../services/rental-timer-view";

describe("rental timer view", () => {
  const rental = RENTAL_FIXTURES.find((item) => item.id === "rental-overtime");

  it("counts fixed rentals down to zero and then shows overtime consistently", () => {
    expect(rental).toBeDefined();
    const expectedEndMs = new Date(rental!.expectedEndAt!).getTime();

    expect(getRentalTimerView(rental!, expectedEndMs - 5 * 60_000)).toMatchObject({
      label: "متبقي",
      value: "00:05:00",
      tone: "success",
    });
    expect(getRentalTimerView(rental!, expectedEndMs - 2 * 60_000)).toMatchObject({
      label: "متبقي",
      value: "00:02:00",
      tone: "danger",
    });
    expect(getRentalTimerView(rental!, expectedEndMs)).toMatchObject({
      label: "متبقي",
      value: "00:00:00",
      tone: "danger",
      progress: 0,
    });
    expect(getRentalTimerView(rental!, expectedEndMs + 1_000)).toMatchObject({
      label: "وقت إضافي",
      value: "00:00:01",
      tone: "danger",
      progress: 100,
    });
  });
});
