"use client";

import { ROUTES, type EventListItemDto, type EventStatus } from "@mezon-tutors/shared";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  ImageIcon,
  MapPin,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { formatEventHomeDate } from "@/components/events/EventHomeCard";
import { useEventLifecycleStatus } from "@/hooks/use-event-lifecycle";
import {
  isRegistrationOnlyEventDto,
  pickEventContent,
} from "@/lib/event-view";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  EventStatus,
  { badge: string; accent: string }
> = {
  upcoming: {
    badge: "bg-violet-100 text-violet-800 ring-violet-200/80",
    accent: "from-violet-500 to-fuchsia-500",
  },
  ongoing: {
    badge:
      "bg-emerald-100 text-emerald-800 ring-emerald-200/80 motion-safe:[animation:event-live-pulse_2s_ease-in-out_infinite]",
    accent: "from-emerald-500 to-teal-500",
  },
  past: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200/80",
    accent: "from-slate-400 to-slate-500",
  },
};

type EventListRowProps = {
  event: EventListItemDto;
  priceFallback: string;
};

export function EventListRow({ event, priceFallback }: EventListRowProps) {
  const tList = useTranslations("Events.list");
  const tHome = useTranslations("Home.Events.status");
  const tDetail = useTranslations("Events.detail");
  const locale = useLocale();
  const content = pickEventContent(event, locale);
  const lifecycleStatus = useEventLifecycleStatus(event.startAt, event.endAt);
  const statusStyle = STATUS_STYLES[lifecycleStatus];
  const statusLabel = tHome(lifecycleStatus);
  const isPast = lifecycleStatus === "past";
  const isOnline = Boolean(event.location?.isOnline);
  const registrationOnly = isRegistrationOnlyEventDto(event);
  const locationLabel = registrationOnly
    ? tList("registrationOnly")
    : isOnline && !event.location?.city && !event.location?.venue
      ? tDetail("meta.online")
      : event.location?.venue && event.location?.city
        ? `${event.location.venue}, ${event.location.city}`
        : event.location?.city && event.location?.country
          ? `${event.location.city}, ${event.location.country}`
          : tList("registrationOnly");
  const price = content.priceLabel ?? priceFallback;
  const summary = content.cardDescription ?? content.tagline;
  const detailHref = ROUTES.EVENTS.DETAIL(event.slug);
  const dateLabel = formatEventHomeDate(event.startAt, locale);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-violet-100/90 bg-white shadow-[0_8px_32px_-24px_rgba(91,33,182,0.2)] transition-all duration-300 hover:border-violet-200 hover:shadow-[0_16px_40px_-20px_rgba(91,33,182,0.28)]">
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1 bg-gradient-to-b opacity-80",
          statusStyle.accent,
        )}
      />

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
        <Link
          href={detailHref}
          className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-44 md:w-52"
        >
          {event.coverImageUrl ? (
            <Image
              src={event.coverImageUrl}
              alt=""
              fill
              className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-[1.04]",
                isPast && "grayscale-[15%] saturate-90",
              )}
              sizes="(max-width: 640px) 100vw, 208px"
            />
          ) : (
            <div className="flex h-full min-h-[9rem] items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-50">
              <ImageIcon className="size-8 text-violet-300" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <span className="absolute top-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase ring-1 ring-white/20 backdrop-blur-sm">
            {content.cardTag ?? content.theme}
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-violet-700 uppercase ring-1 ring-violet-200/80">
                  {content.theme}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1",
                    statusStyle.badge,
                  )}
                >
                  {lifecycleStatus === "ongoing" ? (
                    <span className="relative mr-1.5 inline-flex size-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/80" />
                      <span className="relative size-1.5 rounded-full bg-emerald-500" />
                    </span>
                  ) : null}
                  {statusLabel}
                </span>
              </div>

              <Link href={detailHref} className="block">
                <h2 className="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-violet-800 sm:text-xl">
                  {content.title}
                </h2>
              </Link>

              {content.tagline ? (
                <p className="line-clamp-1 text-sm font-medium text-violet-700/90">
                  {content.tagline}
                </p>
              ) : null}

              {summary ? (
                <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                  {summary}
                </p>
              ) : null}
            </div>

            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/80">
              {price}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 ring-1 ring-violet-200/70">
              <Calendar className="size-3 text-violet-600" />
              {dateLabel}
            </span>
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200/80">
              {isOnline ? (
                <Video className="size-3 shrink-0" />
              ) : (
                <MapPin className="size-3 shrink-0" />
              )}
              <span className="truncate">{locationLabel}</span>
            </span>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-violet-50 pt-3">
            <Link href={detailHref}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full border-violet-200 bg-white px-4 text-xs font-semibold text-violet-800 hover:bg-violet-50"
              >
                {tList("actions.viewDetail")}
                <ChevronRight className="ml-0.5 size-3.5" />
              </Button>
            </Link>
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button
                size="sm"
                className={cn(
                  "h-8 rounded-full px-4 text-xs font-semibold text-white",
                  isPast
                    ? "bg-slate-700 hover:bg-slate-800"
                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-sm shadow-violet-300/30 hover:brightness-105",
                )}
              >
                {isPast ? tList("actions.viewDetail") : tList("actions.register")}
                <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
