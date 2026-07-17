import type {
  EventDetailDto,
  EventListItemDto,
  EventLocaleContent,
  EventLocationDto,
} from "@mezon-tutors/shared";

export function pickEventContent(
  event: EventListItemDto | EventDetailDto,
  _locale: string,
): EventLocaleContent {
  return event.content;
}

/** SEO / share copy — prefers explicit seo* fields, then falls back to display content. */
export function pickEventShareContent(
  event: EventListItemDto | EventDetailDto,
  _locale: string,
): {
  shareTitle: string;
  shareDescription: string;
  displayTitle: string;
} {
  const content = pickEventContent(event, _locale);
  const displayTitle = content.title.replace(/\n/g, " ").trim();
  const shareTitle =
    content.seoTitle?.trim() ||
    content.title ||
    displayTitle;
  const shareDescription =
    content.seoDescription?.trim() ||
    content.tagline.replace(/\n/g, " ").trim() ||
    "Workshop và sự kiện tiếng Anh dành cho người đi làm trên Mezonly.";

  return { shareTitle, shareDescription, displayTitle };
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
