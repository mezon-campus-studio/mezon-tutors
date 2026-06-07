import type { EventDetailDto, EventListItemDto } from "@mezon-tutors/shared";

type ApiEnvelope<T> = {
  data: T;
  error: unknown;
};

const API_BASE = process.env.NEXT_PUBLIC_API_ENDPOINT?.replace(/\/$/, "");

async function fetchPublicApi<T>(path: string): Promise<T | null> {
  if (!API_BASE) return null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublishedEvents(): Promise<EventListItemDto[]> {
  const data = await fetchPublicApi<EventListItemDto[]>("/events");
  return data ?? [];
}

export async function fetchPublishedEventBySlug(
  slug: string,
): Promise<EventDetailDto | null> {
  return fetchPublicApi<EventDetailDto>(`/events/${encodeURIComponent(slug)}`);
}
