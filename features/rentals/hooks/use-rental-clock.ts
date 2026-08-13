"use client";

import { useEffect, useState } from "react";
import { currentMockServerMs, MOCK_SERVER_TIME } from "../services/rental-rules";

export function useRentalClock(running = true) {
  const [referenceMs, setReferenceMs] = useState(() => new Date(MOCK_SERVER_TIME.referenceIso).getTime());

  useEffect(() => {
    if (!running) return;
    const update = () => setReferenceMs(currentMockServerMs());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  return referenceMs;
}

