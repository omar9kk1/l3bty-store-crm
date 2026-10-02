import { afterEach, describe, expect, it, vi } from "vitest";
import { MOCK_SERVER_TIME } from "../services/rental-rules";
import { createRentalClockStore } from "../services/rental-clock-store";

describe("shared rental clock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes one identical reference time to every subscriber from one interval", () => {
    vi.useFakeTimers();
    let currentTime = new Date(MOCK_SERVER_TIME.referenceIso).getTime();
    const readCurrentTime = vi.fn(() => currentTime);
    const store = createRentalClockStore(readCurrentTime);
    const cardListener = vi.fn();
    const stripListener = vi.fn();

    const unsubscribeCard = store.subscribe(cardListener);
    const unsubscribeStrip = store.subscribe(stripListener);

    expect(readCurrentTime).toHaveBeenCalledTimes(1);

    currentTime += 1_000;
    vi.advanceTimersByTime(1_000);

    expect(readCurrentTime).toHaveBeenCalledTimes(2);
    expect(cardListener).toHaveBeenCalledTimes(1);
    expect(stripListener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(currentTime);

    unsubscribeCard();
    unsubscribeStrip();

    currentTime += 1_000;
    vi.advanceTimersByTime(1_000);
    expect(readCurrentTime).toHaveBeenCalledTimes(2);
  });
});
