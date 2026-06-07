import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublishedEventBySlug } from "@/lib/event-api.server";
import { buildEventDetailMetadata } from "@/lib/event-seo";
import EventDetailPage from "@/views/events/event-detail";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildEventDetailMetadata(slug);
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await fetchPublishedEventBySlug(slug);
  if (!event) {
    notFound();
  }

  return <EventDetailPage event={event} />;
}
