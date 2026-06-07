export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export type EventLocation = {
  city: string;
  country: string;
  isOnline: boolean;
  venue?: string;
};

export type EventSpeaker = {
  id: string;
  nameKey: string;
  roleKey: string;
  categoryKey: string;
  bioKey?: string;
  image: string;
  gradient: string;
};

export type EventFaqItem = {
  id: string;
  questionKey: string;
  answerKey: string;
};

export type EventGalleryImage = {
  src: string;
  captionKey: string;
};

export type EventMeta = {
  slug: string;
  status: EventStatus;
  startAt: string;
  endAt?: string;
  doorsOpenAt?: string;
  /** Omit when the event has no venue — registration via form only */
  location?: EventLocation;
  registrationUrl: string;
  coverImage: string;
  /** Dedicated image for Open Graph / social sharing */
  ogImage: string;
  galleryImages: EventGalleryImage[];
  highlightIds: string[];
  agendaIds: string[];
  speakerIds: string[];
  faqIds: string[];
  stats: Array<{ valueKey: string; labelKey: string }>;
};
