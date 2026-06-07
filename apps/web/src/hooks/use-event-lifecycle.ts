import { computeEventLifecycleStatus, type EventStatus } from "@mezon-tutors/shared";
import { useEffect, useState } from "react";

export function useEventLifecycleStatus(
  startAt: string,
  endAt?: string | null,
): EventStatus {
  const [status, setStatus] = useState<EventStatus>(() =>
    computeEventLifecycleStatus(startAt, endAt),
  );

  useEffect(() => {
    const tick = () => setStatus(computeEventLifecycleStatus(startAt, endAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startAt, endAt]);

  return status;
}
