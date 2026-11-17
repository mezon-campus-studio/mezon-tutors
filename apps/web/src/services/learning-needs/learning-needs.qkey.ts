export const learningNeedsQueryKey = {
  booking: (bookingId: string) => ['learning-needs', 'booking', bookingId] as const,
  channel: (channelId: string) => ['learning-needs', 'channel', channelId] as const,
} as const;
