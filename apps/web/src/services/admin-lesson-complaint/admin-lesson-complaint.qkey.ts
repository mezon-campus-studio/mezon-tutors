export const adminLessonComplaintQueryKey = {
  all: ["admin-lesson-complaints"] as const,
  list: (status?: string) =>
    [...adminLessonComplaintQueryKey.all, "list", status ?? "all"] as const,
  metrics: () => [...adminLessonComplaintQueryKey.all, "metrics"] as const,
};
