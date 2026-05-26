export type SubscriptionSlotScheduleOption = {
  date: string;
  startTime: string;
  endTime: string;
};

export type SubscriptionSlotRescheduleOptionsResponse = {
  slots: SubscriptionSlotScheduleOption[];
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
