import type { EventListItemDto } from "@mezon-tutors/shared";

const lifecycleOrder = { upcoming: 0, ongoing: 1, past: 2 } as const;

export function sortPublishedEvents(events: EventListItemDto[]) {
  return [...events].sort((a, b) => {
    const statusDiff =
      lifecycleOrder[a.lifecycleStatus] - lifecycleOrder[b.lifecycleStatus];
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
}
