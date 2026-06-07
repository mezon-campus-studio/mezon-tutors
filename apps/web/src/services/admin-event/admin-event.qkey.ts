import type { EventPublishStatusFilter } from "@mezon-tutors/shared";

export const adminEventQueryKey = {
  all: ["admin-events"] as const,
  list: (status?: EventPublishStatusFilter) =>
    [...adminEventQueryKey.all, "list", status ?? "all"] as const,
  detail: (id: string) => [...adminEventQueryKey.all, "detail", id] as const,
  metrics: () => [...adminEventQueryKey.all, "metrics"] as const,
};
