"use client";

import { ROUTES } from "@mezon-tutors/shared";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { EventHomeCard } from "@/components/events/EventHomeCard";
import { Button } from "@/components/ui";
import { isRegistrationOnlyEventDto, pickEventContent } from "@/lib/event-view";
import { sortPublishedEvents } from "@/lib/event-sort";
import { cn } from "@/lib/utils";
import { usePublishedEvents } from "@/services";
import { useInView } from "../hooks/useInView";

const HOME_EVENT_PREVIEW_LIMIT = 2;

function EventMarquee({ text }: { text: string }) {
  const track = `${text}   ${text}`;

  return (
    <div className="relative overflow-hidden border-y border-violet-100/60 bg-violet-50/60 py-2.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#ede9fe] to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#ede9fe] to-transparent sm:w-24" />
      <div className="flex w-max motion-safe:[animation:event-marquee_40s_linear_infinite] motion-reduce:animate-none">
        <p className="shrink-0 px-4 text-xs font-semibold tracking-[0.25em] text-violet-500/65 uppercase">
          {track}
        </p>
        <p
          className="shrink-0 px-4 text-xs font-semibold tracking-[0.25em] text-violet-500/65 uppercase"
          aria-hidden
        >
          {track}
        </p>
      </div>
    </div>
  );
}

export default function HomeEventsSection() {
  const t = useTranslations("Home.Events");
  const tDetail = useTranslations("Events.detail");
  const locale = useLocale();
  const { ref, isInView } = useInView();
  const { data: events = [], isLoading } = usePublishedEvents();

  useEffect(() => {
    if (window.location.hash !== "#events") return;
    document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const publishedEvents = sortPublishedEvents(events);
  const previewEvents = publishedEvents.slice(0, HOME_EVENT_PREVIEW_LIMIT);

  const marqueeText =
    publishedEvents
      .map((event) => pickEventContent(event, locale).marquee ?? pickEventContent(event, locale).title)
      .join("   ") || t("marqueeFallback");

  return (
    <section
      id="events"
      ref={ref}
      className="relative scroll-mt-24 overflow-hidden border-t border-violet-100/40 bg-[linear-gradient(180deg,#faf9ff_0%,#f3efff_50%,#ebe6ff_100%)] py-8 text-slate-900 sm:py-10"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-1/4 size-72 rounded-full bg-violet-200/25 blur-[90px] motion-safe:[animation:hero-blob-drift_24s_ease-in-out_infinite] motion-reduce:animate-none" />
        <div className="absolute right-1/4 bottom-0 size-80 rounded-full bg-fuchsia-200/15 blur-[80px] motion-safe:[animation:hero-blob-drift_20s_ease-in-out_infinite_reverse] motion-reduce:animate-none" />
      </div>

      <EventMarquee text={marqueeText} />

      <div className="mx-auto max-w-7xl px-6 pt-6 lg:px-10 lg:pt-8">
        <header
          className={cn(
            "mx-auto mb-5 max-w-2xl space-y-2.5 text-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:mb-6",
            isInView
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
          )}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/50">
            <Sparkles className="size-3.5" />
            {t("badge")}
          </span>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {t("title")}
          </h2>
          <p className="text-base leading-7 text-slate-600">{t("description")}</p>
        </header>

        {isLoading ? (
          <p className="text-center text-sm text-slate-500">{t("loading")}</p>
        ) : publishedEvents.length === 0 ? (
          <p className="text-center text-sm text-slate-500">{t("empty")}</p>
        ) : (
          <div
            className={cn(
              "mx-auto grid gap-3 sm:gap-4",
              previewEvents.length === 1
                ? "max-w-md grid-cols-1"
                : "max-w-4xl sm:grid-cols-2",
            )}
          >
            {previewEvents.map((event, index) => {
              const content = pickEventContent(event, locale);
              const registrationOnly = isRegistrationOnlyEventDto(event);
              const isOnline = Boolean(event.location?.isOnline);
              const locationLabel = registrationOnly
                ? t("registrationOnly")
                : isOnline && !event.location?.city && !event.location?.venue
                  ? tDetail("meta.online")
                  : event.location?.venue && event.location?.city
                    ? `${event.location.venue}, ${event.location.city}`
                    : event.location?.city && event.location?.country
                      ? `${event.location.city}, ${event.location.country}`
                      : t("registrationOnly");

              return (
                <EventHomeCard
                  key={event.id}
                  slug={event.slug}
                  accentIndex={index}
                  animationIndex={index}
                  isVisible={isInView}
                  status={event.lifecycleStatus}
                  startAt={event.startAt}
                  endAt={event.endAt}
                  doorsOpenAt={event.doorsOpenAt}
                  isOnline={isOnline}
                  locationLabel={locationLabel}
                  coverImage={event.coverImageUrl}
                  theme={content.theme}
                  title={content.title}
                  tagline={content.tagline}
                  description={content.cardDescription ?? content.tagline}
                  tag={content.cardTag ?? content.theme}
                  price={content.priceLabel ?? t("priceFree")}
                  registerLabel={t("register")}
                  locale={locale}
                />
              );
            })}
          </div>
        )}

        {publishedEvents.length > HOME_EVENT_PREVIEW_LIMIT ? (
          <div className="mx-auto mt-6 flex max-w-4xl justify-center">
            <Link href={ROUTES.EVENTS.INDEX}>
              <Button
                variant="outline"
                className="h-10 rounded-full border-violet-200 bg-white px-6 text-sm font-semibold text-violet-800 shadow-sm shadow-violet-100/50 transition-all hover:border-violet-300 hover:bg-violet-50"
              >
                {t("viewAll")}
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <EventMarquee text={marqueeText} />
      </div>
    </section>
  );
}
