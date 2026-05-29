export type SubscriptionSlotScheduleOption = {
  date: string;
  startTime: string;
  endTime: string;
};

export type SubscriptionSlotRescheduleOptionsResponse = {
  /** Full tutor availability candidates for the week (includes blocked). */
  slots: SubscriptionSlotScheduleOption[];
  /** Slots that overlap existing lessons or are within lead-time rules. */
  blockedSlots: SubscriptionSlotScheduleOption[];
  tutorTimezone: string;
  lessonDurationMinutes: number;
  gridIntervalMinutes: number;
};

export type RescheduleSubscriptionSlotPayload = {
  date: string;
  startTime: string;
  endTime: string;
};

export type SubscriptionSlotRescheduleResult = {
  success: true;
};
