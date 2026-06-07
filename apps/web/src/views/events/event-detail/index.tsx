"use client";

import { ROUTES, type EventDetailDto, type EventStatus } from "@mezon-tutors/shared";
import { useEventLifecycleStatus } from "@/hooks/use-event-lifecycle";
import {
  formatEventLocationLabel,
  hasEventLocationDto,
  pickEventContent,
} from "@/lib/event-view";
import { EventReveal, HeroEnter } from "@/views/events/event-detail/components/EventReveal";
import { EventSectionNav } from "@/views/events/event-detail/components/EventSectionNav";
import { EventShareBanner } from "@/views/events/event-detail/components/EventShareBanner";
import { EventSpeakersSection } from "@/views/events/event-detail/components/EventSpeakersSection";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Clock,
  ExternalLink,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type EventDetailPageProps = {
  event: EventDetailDto;
};

export default function EventDetailPage({ event }: EventDetailPageProps) {
  return <EventDetailContent event={event} />;
}

function EventDetailContent({ event }: { event: EventDetailDto }) {
  const tDetail = useTranslations("Events.detail");
  const locale = useLocale();

  const dateLabel = formatLongDate(event.startAt, locale);
  const locationLabel = formatEventLocationLabel(event.location, locale, {
    online: tDetail("meta.online"),
    registrationOnly: tDetail("meta.registrationOnly"),
  });
  const doorsOpenLabel = event.doorsOpenAt
    ? formatTime(event.doorsOpenAt, locale)
    : null;
  const showSpeakers = event.organizers.length > 0;

  return (
    <main className="bg-white text-slate-900">
      <EventHero
        event={event}
        dateLabel={dateLabel}
        locationLabel={locationLabel}
        doorsOpenLabel={doorsOpenLabel}
      />

      <EventSectionNav hasSpeakers={showSpeakers} />

      <EventAbout event={event} />

      {showSpeakers ? (
        <EventSpeakersSection organizers={event.organizers} />
      ) : null}

      <EventRegister event={event} />

      <EventShareBanner event={event} dateLabel={dateLabel} />
    </main>
  );
}

function EventHero({
  event,
  dateLabel,
  locationLabel,
  doorsOpenLabel,
}: {
  event: EventDetailDto;
  dateLabel: string;
  locationLabel: string | null;
  doorsOpenLabel: string | null;
}) {
  const tDetail = useTranslations("Events.detail");
  const locale = useLocale();
  const content = pickEventContent(event, locale);
  const showLocation = hasEventLocationDto(event.location);
  const lifecycleStatus = useEventLifecycleStatus(event.startAt, event.endAt);

  return (
    <section className="relative -mt-14 min-h-[min(88vh,820px)] overflow-hidden bg-[#0c0a14] pt-14 text-white sm:-mt-[4.5rem] sm:min-h-[min(92vh,880px)] sm:pt-[4.5rem]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(124,58,237,0.38),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_100%_60%,rgba(219,39,119,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_0%_80%,rgba(99,102,241,0.12),transparent_50%)]" />
        <div className="absolute -top-24 left-1/4 size-[28rem] rounded-full bg-violet-600/20 blur-[100px] motion-safe:[animation:event-detail-float_18s_ease-in-out_infinite]" />
        <div className="absolute right-0 bottom-0 size-96 rounded-full bg-fuchsia-600/15 blur-[90px] motion-safe:[animation:event-detail-float_22s_ease-in-out_infinite_reverse]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[48px_48px] motion-safe:[animation:event-grid-drift_24s_linear_infinite]" />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#0c0a14] via-[#0c0a14]/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0c0a14] to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[inherit] max-w-7xl flex-col px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-10 lg:pb-20 lg:pt-8">
        <HeroEnter delay={0}>
          <Link
            href={ROUTES.HOME.events}
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-white/50 transition-colors hover:text-white sm:mb-8 sm:gap-2 sm:text-sm"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Events
          </Link>
        </HeroEnter>

        <div className="grid flex-1 items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="space-y-5 sm:space-y-6 lg:space-y-7">
            <HeroEnter delay={80}>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge className="h-auto rounded-full border border-violet-400/35 bg-violet-500/20 px-3 py-1 text-[11px] font-semibold text-violet-100 shadow-sm shadow-violet-900/30">
                  {content.theme}
                </Badge>
                <Badge
                  className={cn(
                    "h-auto rounded-full px-3 py-1 text-[11px] font-semibold",
                    lifecycleStatus === "ongoing"
                      ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100 motion-safe:[animation:event-live-pulse_2s_ease-in-out_infinite]"
                      : "border border-white/15 bg-white/8 text-white/75",
                  )}
                >
                  {tDetail(`status.${lifecycleStatus}`)}
                </Badge>
              </div>
            </HeroEnter>

            <HeroEnter delay={160}>
              <div className="space-y-4">
                <h1 className="whitespace-pre-line text-[1.65rem] font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.85rem] lg:leading-[1.08]">
                  <span className="bg-gradient-to-br from-white via-white to-white/75 bg-clip-text text-transparent">
                    {content.title}
                  </span>
                </h1>
                <p className="max-w-xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7 lg:text-lg">
                  {content.tagline}
                </p>
              </div>
            </HeroEnter>

            <HeroEnter delay={240}>
              <div className="flex flex-wrap gap-1.5 text-sm text-white/70 sm:gap-2">
                <HeroMetaPill icon={Calendar}>{dateLabel}</HeroMetaPill>
                {showLocation && locationLabel ? (
                  <HeroMetaPill icon={MapPin}>{locationLabel}</HeroMetaPill>
                ) : (
                  <HeroMetaPill icon={ClipboardCheck}>
                    {tDetail("meta.registrationOnly")}
                  </HeroMetaPill>
                )}
                {showLocation && doorsOpenLabel ? (
                  <HeroMetaPill icon={Clock}>
                    {tDetail("meta.doorsOpen")} {doorsOpenLabel}
                  </HeroMetaPill>
                ) : null}
              </div>
            </HeroEnter>

            <HeroEnter delay={320}>
              <div className="flex flex-col gap-2.5 pt-1 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:gap-3">
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex w-full rounded-full min-[420px]:w-fit min-[420px]:max-w-full"
                >
                  <Button className="relative z-10 h-11 w-full rounded-full bg-white px-6 text-sm font-semibold text-slate-900 shadow-xl shadow-violet-900/25 transition-all hover:bg-violet-50 hover:shadow-violet-500/20 min-[420px]:h-12 min-[420px]:w-auto min-[420px]:px-7">
                    {tDetail("actions.register")}
                    <ArrowRight className="ml-1.5 size-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                  >
                    <span className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent motion-safe:[animation:event-cta-shine_3s_ease-in-out_infinite]" />
                  </span>
                </a>
                <Link href="#about" className="inline-flex w-full min-[420px]:w-auto">
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-full border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/12 min-[420px]:h-12 min-[420px]:w-auto min-[420px]:px-7"
                  >
                    {tDetail("actions.watchIntro")}
                  </Button>
                </Link>
              </div>
            </HeroEnter>

            <HeroEnter delay={400}>
              <EventCountdown startAt={event.startAt} status={lifecycleStatus} />
            </HeroEnter>
          </div>

          <div
            className="motion-safe:[animation:event-detail-hero-scale_1.1s_cubic-bezier(0.22,1,0.36,1)_200ms_both] motion-reduce:opacity-100"
          >
            <div className="group relative">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-violet-500/50 via-fuchsia-500/30 to-violet-600/50 opacity-60 blur-md motion-safe:[animation:event-border-glow_4s_ease-in-out_infinite] motion-reduce:opacity-50"
              />
              <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/50 ring-1 ring-white/10">
                <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[5/4]">
                  <Image
                    src={event.coverImageUrl}
                    alt=""
                    fill
                    className="object-cover motion-safe:[animation:event-ken-burns_20s_ease-in-out_infinite] motion-reduce:animate-none"
                    sizes="(max-width: 1024px) 100vw, 46vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a14]/70 via-[#0c0a14]/15 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-900/25 via-transparent to-fuchsia-900/20" />
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                  </div>
                </div>
                <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3">
                  <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-lg backdrop-blur-sm">
                    {content.cardTag ?? content.theme}
                  </span>
              <span className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                {content.priceLabel ?? tDetail("actions.register")}
              </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <HeroEnter delay={600} className="mt-10 flex justify-center lg:mt-12">
          <Link
            href="#about"
            className="group flex flex-col items-center gap-1 text-white/40 transition-colors hover:text-white/70"
            aria-label={tDetail("actions.watchIntro")}
          >
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase">
              {tDetail("actions.scrollHint")}
            </span>
            <ChevronDown className="size-5 motion-safe:[animation:event-scroll-cue_2s_ease-in-out_infinite]" />
          </Link>
        </HeroEnter>
      </div>
    </section>
  );
}

function HeroMetaPill({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-start gap-1.5 rounded-full border border-white/10 bg-white/8 px-2.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm sm:items-center sm:px-3 sm:text-xs">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-violet-300 sm:mt-0" />
      <span className="min-w-0 leading-snug">{children}</span>
    </span>
  );
}

function EventCountdown({
  startAt,
  status,
}: {
  startAt: string;
  status: EventStatus;
}) {
  const t = useTranslations("Events.detail.countdown");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = new Date(startAt).getTime();

  if (status === "ongoing") {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/80" />
          <span className="relative size-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-bold tracking-wide text-emerald-300 uppercase">
          {t("live")}
        </span>
      </div>
    );
  }

  if (status === "past" || Number.isNaN(start)) {
    return (
      <div className="inline-flex items-center rounded-xl border border-white/12 bg-white/6 px-4 py-2.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">
          {t("ended")}
        </span>
      </div>
    );
  }

  const diff = Math.max(0, start - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const units = [
    { label: t("days"), value: days },
    { label: t("hours"), value: hours },
    { label: t("minutes"), value: minutes },
    { label: t("seconds"), value: seconds },
  ];

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-white/12 bg-white/6 p-3 shadow-inner shadow-black/20 backdrop-blur-md">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="min-w-[3.5rem] rounded-xl border border-white/8 bg-white/6 px-3 py-2 text-center"
        >
          <p
            key={`${unit.label}-${unit.value}`}
            className="font-mono text-xl font-bold tabular-nums motion-safe:[animation:event-countdown-pop_0.35s_ease-out]"
          >
            {String(unit.value).padStart(2, "0")}
          </p>
          <p className="text-[9px] font-semibold tracking-wider text-white/40 uppercase">
            {unit.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function EventAbout({ event }: { event: EventDetailDto }) {
  const tDetail = useTranslations("Events.detail");
  const locale = useLocale();
  const content = pickEventContent(event, locale);

  return (
    <section
      id="about"
        className="relative scroll-mt-28 overflow-hidden py-10 sm:scroll-mt-32 sm:py-16"
    >
      <div className="pointer-events-none absolute -top-32 right-0 size-80 rounded-full bg-violet-100/50 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 size-64 rounded-full bg-fuchsia-100/40 blur-[70px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <EventReveal direction="left">
            <div className="space-y-5">
              <p className="text-xs font-bold tracking-[0.2em] text-violet-600 uppercase">
                {tDetail("sections.about.badge")}
              </p>
              <h2 className="whitespace-pre-line text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                {content.aboutTitle ?? content.title}
              </h2>
              <blockquote className="relative border-l-2 border-violet-400 pl-5 text-base italic leading-7 text-slate-500">
                <span
                  aria-hidden
                  className="absolute -left-px top-0 h-8 w-0.5 bg-gradient-to-b from-violet-500 to-fuchsia-400"
                />
                {tDetail("sections.about.quote")}
              </blockquote>
            </div>
          </EventReveal>

          <EventReveal direction="right" delay={120}>
            <div className="space-y-5">
              <p className="text-base leading-7 text-slate-600">
                {content.aboutBody}
              </p>
              {content.aboutHighlight ? (
                <p className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/90 to-fuchsia-50/50 p-5 text-sm font-medium leading-7 text-violet-900 shadow-sm shadow-violet-100/60">
                  {content.aboutHighlight}
                </p>
              ) : null}

              {event.stats.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {event.stats.map((stat, index) => (
                    <EventReveal key={stat.id} delay={index * 80}>
                      <div className="group rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/50">
                        <p className="bg-gradient-to-br from-violet-700 to-fuchsia-600 bg-clip-text text-2xl font-bold text-transparent">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                          {stat.label}
                        </p>
                      </div>
                    </EventReveal>
                  ))}
                </div>
              ) : null}
            </div>
          </EventReveal>
        </div>

        {event.galleryImages.length > 0 ? (
          <EventReveal className="mt-10 sm:mt-12">
            <div className="grid gap-3 sm:grid-cols-3">
              {event.galleryImages.slice(0, 3).map((image) => (
                <figure
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={image.imageUrl}
                      alt={image.caption ?? ""}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  {image.caption ? (
                    <figcaption className="px-3 py-2.5 text-xs text-slate-600">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </EventReveal>
        ) : null}
      </div>
    </section>
  );
}

function EventRegister({ event }: { event: EventDetailDto }) {
  const tDetail = useTranslations("Events.detail");
  const locale = useLocale();
  const content = pickEventContent(event, locale);

  const dateLabel = formatLongDate(event.startAt, locale);
  const showLocation = hasEventLocationDto(event.location);
  const locationLabel = formatEventLocationLabel(event.location, locale, {
    online: tDetail("meta.online"),
    registrationOnly: tDetail("meta.registrationOnly"),
  });

  return (
    <section id="register" className="scroll-mt-28 py-10 sm:scroll-mt-32 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <EventReveal>
          <div className="relative overflow-hidden rounded-3xl p-[1.5px]">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-600 bg-size-[200%_100%] motion-safe:[animation:event-gradient-flow_5s_linear_infinite]"
            />
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-[#12101a] via-[#1a1528] to-[#12101a] shadow-2xl shadow-violet-900/25">
              <div className="pointer-events-none absolute -top-20 right-0 size-72 rounded-full bg-violet-600/25 blur-[80px] motion-safe:[animation:event-detail-float_16s_ease-in-out_infinite]" />
              <div className="pointer-events-none absolute bottom-0 left-0 size-56 rounded-full bg-fuchsia-600/20 blur-[70px]" />

              <div className="relative grid lg:grid-cols-2">
                <div className="space-y-4 p-5 sm:p-6 lg:p-10">
                  <p className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
                    {tDetail("sections.register.badge")}
                  </p>
                  <h2 className="whitespace-pre-line text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                    {content.registerTitle ?? tDetail("sections.register.title")}
                  </h2>
                  <p className="max-w-md text-sm leading-7 text-white/60">
                    {content.registerDescription ?? content.tagline}
                  </p>
                  <p className="text-xs text-white/40">
                    {tDetail("actions.registerNote")}
                  </p>
                </div>

                <div className="flex flex-col justify-between border-t border-white/8 bg-white/4 p-5 backdrop-blur-sm sm:p-6 lg:border-t-0 lg:border-l lg:p-10">
                  <div className="space-y-5">
                    <div className="flex items-baseline gap-2">
                      <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-4xl font-bold text-transparent">
                        {content.priceLabel ?? "—"}
                      </span>
                      <span className="text-sm text-white/45">
                        {tDetail("actions.priceLabel")}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-sm text-white/65">
                      <p className="flex items-center gap-2.5">
                        <Calendar className="size-4 text-violet-400" />
                        {dateLabel}
                      </p>
                      {showLocation && locationLabel ? (
                        <p className="flex items-center gap-2.5">
                          <MapPin className="size-4 text-violet-400" />
                          {locationLabel}
                        </p>
                      ) : (
                        <p className="flex items-start gap-2.5 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3.5 py-3 text-violet-100">
                          <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-violet-400" />
                          {tDetail("meta.registrationHint")}
                        </p>
                      )}
                      {showLocation && event.doorsOpenAt ? (
                        <p className="flex items-center gap-2.5">
                          <Clock className="size-4 text-violet-400" />
                          {tDetail("meta.doorsOpen")}{" "}
                          {formatTime(event.doorsOpenAt, locale)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative mt-8 inline-flex w-fit max-w-full rounded-full"
                  >
                    <Button className="relative z-10 h-12 w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:from-violet-400 hover:to-fuchsia-400 hover:shadow-violet-500/30 sm:w-auto sm:px-10">
                      {tDetail("actions.registerCta")}
                      <ExternalLink className="ml-2 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Button>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                    >
                      <span className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent motion-safe:[animation:event-cta-shine_2.5s_ease-in-out_infinite]" />
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </EventReveal>
      </div>
    </section>
  );
}

function formatLongDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale !== "vi",
  }).format(new Date(iso));
}

function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale !== "vi",
  }).format(new Date(iso));
}
