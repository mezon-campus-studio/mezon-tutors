import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoLocale } from "@/lib/seo-messages";
import EventsListPage from "@/views/events/events-list";

async function loadEventsListMeta(locale: string) {
  const file = (await import(`@mezon-tutors/shared/locales/${locale}/events.json`))
    .default as {
    Events: { list: { meta: { title: string; description: string } } };
  };
  return file.Events.list.meta;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSeoLocale();
  const meta = await loadEventsListMeta(locale);
  return createPageMetadata({
    title: meta.title,
    description: meta.description,
    path: ROUTES.EVENTS.INDEX,
  });
}

export default function Page() {
  return <EventsListPage />;
}
