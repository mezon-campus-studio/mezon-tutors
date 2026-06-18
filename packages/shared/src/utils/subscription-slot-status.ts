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
  if (status === ESubscriptionLessonSlotStatus.REFUNDED) {
    return ESubscriptionLessonSlotStatus.REFUNDED;
  }
  return ESubscriptionLessonSlotStatus.SCHEDULED;
}

export function isSubscriptionSlotCompleted(status: string | undefined | null): boolean {
  return normalizeSubscriptionSlotStatus(status) === ESubscriptionLessonSlotStatus.COMPLETED;
}

export function isSubscriptionSlotRefunded(status: string | undefined | null): boolean {
  return normalizeSubscriptionSlotStatus(status) === ESubscriptionLessonSlotStatus.REFUNDED;
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

/** Student refund for one slot (prorated `grossAmount` across all slots in the enrollment). */
export function subscriptionSlotGrossAmount(
  totalGrossAmount: bigint,
  slotCount: number,
  slotIndex: number
): bigint {
  return subscriptionSlotTutorAmount(totalGrossAmount, slotCount, slotIndex);
}

/** Platform fee attributed to one subscription slot. */
export function subscriptionSlotPlatformFee(
  totalPlatformFee: bigint,
  slotCount: number,
  slotIndex: number
): bigint {
  return subscriptionSlotTutorAmount(totalPlatformFee, slotCount, slotIndex);
}
