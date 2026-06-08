export type SubscriptionSlotCancelResult = {
  credited: boolean;
  refundAmount: number;
  currency: string;
};

/** Result when a tutor cancels a lesson (trial or subscription) with optional wallet refund. */
export type TutorLessonCancelResult = {
  success: boolean;
  refunded: boolean;
  refundAmount: number;
  currency: string;
};
