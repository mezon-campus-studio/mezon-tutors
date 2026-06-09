export const googleCalendarQueryKey = {
  all: ['google-calendar'] as const,
  status: () => [...googleCalendarQueryKey.all, 'status'] as const,
};
