import { ESubscriptionLessonSlotStatus } from '../enums/subscription-lesson-slot';

export function normalizeSubscriptionSlotStatus(
  status: string | undefined | null
): ESubscriptionLessonSlotStatus {
  if (status === ESubscriptionLessonSlotStatus.COMPLETED) {
    return ESubscriptionLessonSlotStatus.COMPLETED;
  }
  if (status === ESubscriptionLessonSlotStatus.CANCELLED) {
    return ESubscriptionLessonSlotStatus.CANCELLED;
  }
  return ESubscriptionLessonSlotStatus.SCHEDULED;
}

export function isSubscriptionSlotCompleted(status: string | undefined | null): boolean {
  return normalizeSubscriptionSlotStatus(status) === ESubscriptionLessonSlotStatus.COMPLETED;
}

export function subscriptionSlotTutorAmount(
  totalTutorAmount: bigint,
  slotCount: number,
  slotIndex: number
): bigint {
  if (slotCount <= 0 || slotIndex < 0 || slotIndex >= slotCount) {
    return 0n;
  }
  const base = totalTutorAmount / BigInt(slotCount);
  const remainder = Number(totalTutorAmount % BigInt(slotCount));
  return base + (slotIndex < remainder ? 1n : 0n);
}
