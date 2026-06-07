import type { EventMeta, EventSpeaker } from '../types/event';

export const EVENT_SLUGS = [
  'business-english-after-work',
  'speaking-confidence-june',
] as const;

export type EventSlug = (typeof EVENT_SLUGS)[number];

export const EVENT_SPEAKERS: Record<string, EventSpeaker> = {
  'ma-ielts': {
    id: 'ma-ielts',
    nameKey: 'speakers.maIelts.name',
    roleKey: 'speakers.maIelts.role',
    categoryKey: 'speakers.maIelts.category',
    bioKey: 'speakers.maIelts.bio',
    image: '/images/tutor.png',
    gradient: 'from-violet-600 to-fuchsia-500',
  },
  'james-native': {
    id: 'james-native',
    nameKey: 'speakers.jamesNative.name',
    roleKey: 'speakers.jamesNative.role',
    categoryKey: 'speakers.jamesNative.category',
    bioKey: 'speakers.jamesNative.bio',
    image: '/images/teach.jpg',
    gradient: 'from-indigo-600 to-violet-500',
  },
  'emma-coach': {
    id: 'emma-coach',
    nameKey: 'speakers.emmaCoach.name',
    roleKey: 'speakers.emmaCoach.role',
    categoryKey: 'speakers.emmaCoach.category',
    bioKey: 'speakers.emmaCoach.bio',
    image: '/images/home-ogp.png',
    gradient: 'from-fuchsia-600 to-rose-500',
  },
  'david-toeic': {
    id: 'david-toeic',
    nameKey: 'speakers.davidToeic.name',
    roleKey: 'speakers.davidToeic.role',
    categoryKey: 'speakers.davidToeic.category',
    bioKey: 'speakers.davidToeic.bio',
    image: '/images/tutor.png',
    gradient: 'from-purple-600 to-indigo-500',
  },
};

const BUSINESS_GALLERY = [
  { src: '/images/teach.jpg', captionKey: 'gallery.0' },
  { src: '/images/tutor.png', captionKey: 'gallery.1' },
  { src: '/images/home-ogp.png', captionKey: 'gallery.2' },
  { src: '/images/Mezonly-logo.png', captionKey: 'gallery.3' },
  { src: '/images/tutor.png', captionKey: 'gallery.4' },
  { src: '/images/teach.jpg', captionKey: 'gallery.5' },
] as const;

const SPEAKING_GALLERY = [
  { src: '/images/home-ogp.png', captionKey: 'gallery.0' },
  { src: '/images/teach.jpg', captionKey: 'gallery.1' },
  { src: '/images/tutor.png', captionKey: 'gallery.2' },
  { src: '/images/Mezonly-logo-original.png', captionKey: 'gallery.3' },
  { src: '/images/home-ogp.png', captionKey: 'gallery.4' },
  { src: '/images/teach.jpg', captionKey: 'gallery.5' },
] as const;

export const EVENTS: Record<EventSlug, EventMeta> = {
  'business-english-after-work': {
    slug: 'business-english-after-work',
    status: 'ongoing',
    startAt: '2026-06-14T19:00:00+07:00',
    endAt: '2026-06-14T21:30:00+07:00',
    registrationUrl: 'https://forms.gle/mezonly-business-english',
    coverImage: '/images/teach.jpg',
    ogImage: '/images/home-ogp.png',
    galleryImages: [...BUSINESS_GALLERY],
    highlightIds: ['roleplay', 'feedback', 'takeaway'],
    agendaIds: ['checkin', 'warmup', 'practice', 'wrapup'],
    speakerIds: ['ma-ielts', 'james-native', 'emma-coach', 'david-toeic'],
    faqIds: ['what-is', 'who-for', 'prepare', 'online'],
    stats: [
      { valueKey: 'speakers.value', labelKey: 'speakers.label' },
      { valueKey: 'sessions.value', labelKey: 'sessions.label' },
      { valueKey: 'seats.value', labelKey: 'seats.label' },
      { valueKey: 'hours.value', labelKey: 'hours.label' },
    ],
  },
  'speaking-confidence-june': {
    slug: 'speaking-confidence-june',
    status: 'upcoming',
    startAt: '2026-06-28T09:00:00+07:00',
    endAt: '2026-06-28T12:00:00+07:00',
    doorsOpenAt: '2026-06-28T08:45:00+07:00',
    location: {
      city: 'TP. Hồ Chí Minh',
      country: 'Việt Nam',
      isOnline: false,
      venue: 'WeWork Saigon Centre',
    },
    registrationUrl: 'https://forms.gle/mezonly-speaking-confidence',
    coverImage: '/images/home-ogp.png',
    ogImage: '/images/home-ogp.png',
    galleryImages: [...SPEAKING_GALLERY],
    highlightIds: ['icebreaker', 'drills', 'oneOnOne', 'certificate'],
    agendaIds: ['checkin', 'icebreaker', 'drills', 'roleplay', 'closing'],
    speakerIds: ['emma-coach', 'david-toeic', 'ma-ielts', 'james-native'],
    faqIds: ['what-is', 'who-for', 'prepare', 'in-person', 'certificate'],
    stats: [
      { valueKey: 'speakers.value', labelKey: 'speakers.label' },
      { valueKey: 'sessions.value', labelKey: 'sessions.label' },
      { valueKey: 'seats.value', labelKey: 'seats.label' },
      { valueKey: 'hours.value', labelKey: 'hours.label' },
    ],
  },
};

export const ACTIVE_EVENT_SLUGS = EVENT_SLUGS.filter(
  (slug) => EVENTS[slug].status !== 'past',
);

export function isEventSlug(value: string): value is EventSlug {
  return (EVENT_SLUGS as readonly string[]).includes(value);
}

export function getEventBySlug(slug: string): EventMeta | undefined {
  if (!isEventSlug(slug)) return undefined;
  return EVENTS[slug];
}

export function hasEventSpeakers(event: EventMeta): boolean {
  return event.speakerIds.length > 0;
}

export function hasEventLocation(event: EventMeta): boolean {
  return event.location != null;
}

/** No venue and no speakers — sign-up via form/link only */
export function isRegistrationOnlyEvent(event: EventMeta): boolean {
  return !hasEventLocation(event);
}
