import type {
  EventDetailDto,
  EventListItemDto,
  EventLocaleContent,
  EventLocationDto,
} from "@mezon-tutors/shared";

export function pickEventContent(
  event: EventListItemDto | EventDetailDto,
  locale: string,
): EventLocaleContent {
  if (locale === "en" && event.content.en) {
    return event.content.en;
  }
  return event.content.vi;
}

export function hasEventLocationDto(location?: EventLocationDto | null): boolean {
  if (!location) return false;
  return Boolean(location.venue || location.city || location.country);
}

export function isRegistrationOnlyEventDto(
  event: EventListItemDto | EventDetailDto,
): boolean {
  const location = event.location;
  if (!location) return true;
  return location.isOnline && !location.city && !location.venue;
}

export function formatEventLocationLabel(
  location: EventLocationDto | null | undefined,
  locale: string,
  labels: { online: string; registrationOnly: string },
): string | null {
  if (!location || (!location.city && !location.venue && location.isOnline)) {
    return labels.registrationOnly;
  }
  if (location.isOnline && !location.venue && !location.city) {
    return labels.online;
  }
  if (location.venue && location.city) {
    return `${location.venue}, ${location.city}`;
  }
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  }
  return location.city ?? location.country ?? labels.online;
}
