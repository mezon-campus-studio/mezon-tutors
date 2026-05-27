export const myLessonsQueryKey = {
  overview: (weekStartDate?: string, timezone?: string) =>
    ["my-lessons", weekStartDate, timezone] as const,
} as const;
