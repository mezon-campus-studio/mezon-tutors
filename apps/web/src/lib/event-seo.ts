import { ROUTES } from "@mezon-tutors/shared";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getSeoLocale } from "@/lib/seo-messages";
import { fetchPublishedEventBySlug } from "@/lib/event-api.server";
import { pickEventShareContent } from "@/lib/event-view";

export async function buildEventDetailMetadata(slug: string): Promise<Metadata> {
  const locale = await getSeoLocale();
  const event = await fetchPublishedEventBySlug(slug, { noStore: true });

  if (!event) {
    return buildPageMetadata({
      title: "Event | Mezonly",
      description: "Mezonly English events for working professionals.",
      path: ROUTES.HOME.events,
    });
  }

  const { shareTitle, shareDescription, displayTitle } = pickEventShareContent(
    event,
    locale,
  );

  return buildPageMetadata({
    title: displayTitle,
    openGraphTitle: shareTitle,
    description: shareDescription,
    openGraphDescription: shareDescription,
    path: ROUTES.EVENTS.DETAIL(slug),
    image: event.ogImageUrl,
  });
}
