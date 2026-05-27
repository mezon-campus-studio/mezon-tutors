export const adminTutorApplicationQueryKey = {
  all: ["admin-tutor-applications"] as const,
  list: () => [...adminTutorApplicationQueryKey.all, "list"] as const,
  metrics: () => [...adminTutorApplicationQueryKey.all, "metrics"] as const,
  detail: (id: string) =>
    [...adminTutorApplicationQueryKey.all, "detail", id] as const,
  lessonChangeHistory: (tutorId: string) =>
    [...adminTutorApplicationQueryKey.all, "lesson-change-history", tutorId] as const,
};
