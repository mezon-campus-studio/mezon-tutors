export const myLessonsQueryKey = {
  overview: (weekStartDate?: string) => ['my-lessons', weekStartDate] as const,
} as const;
