import { currentMockServerMs, MOCK_SERVER_TIME } from "./rental-rules";

type ClockListener = () => void;

const INITIAL_REFERENCE_MS = new Date(MOCK_SERVER_TIME.referenceIso).getTime();

export function createRentalClockStore(readCurrentTime = currentMockServerMs) {
  let referenceMs = INITIAL_REFERENCE_MS;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<ClockListener>();

  function publishCurrentTime() {
    const nextReferenceMs = readCurrentTime();
    if (nextReferenceMs === referenceMs) return;
    referenceMs = nextReferenceMs;
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: ClockListener) {
    listeners.add(listener);

    if (listeners.size === 1) {
      publishCurrentTime();
      timer = setInterval(publishCurrentTime, 1_000);
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
  }

  return {
    getServerSnapshot: () => INITIAL_REFERENCE_MS,
    getSnapshot: () => referenceMs,
    subscribe,
  };
}

export const rentalClockStore = createRentalClockStore();
