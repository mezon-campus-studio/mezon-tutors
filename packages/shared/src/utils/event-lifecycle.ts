import type { EventStatus } from '../types/event';

function toTimestamp(value: Date | string): number {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.getTime();
}

function effectiveEndTimestamp(
  startMs: number,
  endAt?: Date | string | null,
): number | null {
  if (!endAt) return null;
  const endMs = toTimestamp(endAt);
  if (Number.isNaN(endMs) || endMs <= startMs) return null;
  return endMs;
}

export function computeEventLifecycleStatus(
  startAt: Date | string,
  endAt?: Date | string | null,
  now: Date | number = new Date(),
): EventStatus {
  const startMs = toTimestamp(startAt);
  const nowMs = typeof now === 'number' ? now : now.getTime();

  if (Number.isNaN(startMs)) return 'past';
  if (nowMs < startMs) return 'upcoming';

  const endMs = effectiveEndTimestamp(startMs, endAt);
  if (endMs == null) return 'ongoing';
  if (nowMs > endMs) return 'past';
  return 'ongoing';
}
