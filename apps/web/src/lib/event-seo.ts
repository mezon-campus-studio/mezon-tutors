import { ROUTES } from "@mezon-tutors/shared";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getSeoLocale } from "@/lib/seo-messages";
import { fetchPublishedEventBySlug } from "@/lib/event-api.server";

export async function buildEventDetailMetadata(slug: string): Promise<Metadata> {
  const locale = await getSeoLocale();
  const event = await fetchPublishedEventBySlug(slug);

  if (!event) {
    return buildPageMetadata({
      title: "Event | Mezonly",
      description: "Mezonly English events for working professionals.",
      path: ROUTES.HOME.events,
    });
  }

  const content =
    locale === "en" && event.content.en ? event.content.en : event.content.vi;

  const title =
    content.seoTitle?.trim() ||
    `Mezonly Events — ${content.title.replace(/\n/g, " ")}`;
  const description =
    content.seoDescription?.trim() ||
    content.tagline.replace(/\n/g, " ") ||
    "Workshop và sự kiện tiếng Anh dành cho người đi làm trên Mezonly.";

  return buildPageMetadata({
    title,
    description,
    path: ROUTES.EVENTS.DETAIL(slug),
    image: event.ogImageUrl,
  });
}
