"use client";

import { ROUTES, type EventStatus } from "@mezon-tutors/shared";
import {
  ArrowRight,
  Calendar,
  Clock,
  Globe,
  ImageIcon,
  MapPin,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { useEventLifecycleStatus } from "@/hooks/use-event-lifecycle";
import { cn } from "@/lib/utils";

export const EVENT_HOME_CARD_ACCENTS = [
  {
    theme: "text-violet-700",
    themeBg: "bg-violet-50 ring-violet-200/80",
    imageOverlay:
      "from-violet-950/60 via-violet-900/10 to-transparent group-hover:from-violet-950/70",
    countdown: "from-violet-500/10 via-fuchsia-500/8 to-violet-500/10 ring-violet-200/70",
  },
  {
    theme: "text-indigo-700",
    themeBg: "bg-indigo-50 ring-indigo-200/80",
    imageOverlay:
      "from-indigo-950/60 via-indigo-900/10 to-transparent group-hover:from-indigo-950/70",
    countdown: "from-indigo-500/10 via-violet-500/8 to-indigo-500/10 ring-indigo-200/70",
  },
] as const;

const STATUS_STYLES: Record<EventStatus, { badge: string; ring: string }> = {
  upcoming: {
    badge: "bg-violet-500/95 text-white",
    ring: "ring-violet-400/40",
  },
  ongoing: {
    badge:
      "bg-emerald-500/95 text-white motion-safe:[animation:event-live-pulse_2s_ease-in-out_infinite]",
    ring: "ring-emerald-400/50",
  },
  past: {
    badge: "bg-slate-800/85 text-white/90",
    ring: "ring-white/20",
  },
};

export function formatEventHomeDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale !== "vi",
  }).format(new Date(iso));
}

export function formatEventHomeTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale !== "vi",
  }).format(new Date(iso));
}

export type EventHomeCardProps = {
  slug?: string;
  accentIndex?: number;
  status?: EventStatus;
  startAt?: string;
  endAt?: string | null;
  doorsOpenAt?: string | null;
  isOnline?: boolean;
  startAtLabel?: string;
  locationLabel: string;
  coverImage?: string | null;
  statusLabel?: string;
  theme: string;
  title: string;
  tagline: string;
  description: string;
  tag: string;
  price: string;
  registerLabel: string;
  locale: string;
  preview?: boolean;
  isVisible?: boolean;
  animationIndex?: number;
};

export function EventHomeCard({
  slug = "preview",
  accentIndex = 0,
  status: statusProp = "upcoming",
  startAt,
  endAt,
  doorsOpenAt,
  isOnline = false,
  startAtLabel,
  locationLabel,
  coverImage,
  statusLabel: statusLabelProp,
  theme,
  title,
  tagline,
  description,
  tag,
  price,
  registerLabel,
  locale,
  preview = false,
  isVisible = true,
  animationIndex = 0,
}: EventHomeCardProps) {
  const tStatus = useTranslations("Home.Events.status");
  const tHome = useTranslations("Home.Events");
  const tCard = useTranslations("Home.Events.card");
  const accent = EVENT_HOME_CARD_ACCENTS[accentIndex % EVENT_HOME_CARD_ACCENTS.length];
  const lifecycleStatus = useEventLifecycleStatus(
    startAt ?? "2099-12-31T23:59:59.000Z",
    endAt,
  );
  const status = startAt ? lifecycleStatus : statusProp;
  const statusLabel = statusLabelProp ?? tStatus(status);
  const statusStyle = STATUS_STYLES[status];
  const dateLabel =
    startAtLabel ?? (startAt ? formatEventHomeDate(startAt, locale) : "—");
  const doorsOpenLabel = doorsOpenAt
    ? formatEventHomeTime(doorsOpenAt, locale)
    : null;
  const detailHref = ROUTES.EVENTS.DETAIL(slug);
  const isPast = status === "past";

  const cardInner = (
    <>
      <div className="relative aspect-[5/2] w-full shrink-0 overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt=""
            fill
            className={cn(
              "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]",
              isPast && "grayscale-[15%] saturate-90",
            )}
            sizes="(max-width: 640px) 100vw, 50vw"
            unoptimized={preview && coverImage.startsWith("http")}
          />
        ) : (
          <div
            className={cn(
              "flex h-full items-center justify-center bg-gradient-to-br",
              accentIndex % 2 === 0
                ? "from-violet-200 via-fuchsia-100 to-violet-100"
                : "from-indigo-200 via-violet-100 to-indigo-100",
            )}
          >
            <ImageIcon className="size-6 text-violet-400/70" />
          </div>
        )}

        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-t transition-colors duration-500",
            accent.imageOverlay,
          )}
        />

        <div className="absolute top-2 right-2 left-2 flex items-start justify-between gap-1.5">
          <span className="inline-flex max-w-[58%] truncate rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase ring-1 ring-white/20 backdrop-blur-sm">
            {tag || "—"}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ring-1 backdrop-blur-sm",
              statusStyle.badge,
              statusStyle.ring,
            )}
          >
            {status === "ongoing" ? (
              <span className="relative mr-1.5 inline-flex size-2 align-middle">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/80" />
                <span className="relative size-2 rounded-full bg-white" />
              </span>
            ) : null}
            {statusLabel}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-2.5 pt-6 pb-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] uppercase ring-1 backdrop-blur-sm",
              accent.themeBg,
              accent.theme,
            )}
          >
            {theme || "—"}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 backdrop-blur-sm",
              isPast
                ? "bg-white/90 text-slate-600 ring-white/50"
                : "bg-emerald-500/90 text-white ring-emerald-400/40",
            )}
          >
            {price}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="space-y-0.5">
          <h3 className="line-clamp-1 text-sm font-bold leading-snug tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-violet-800">
            {title || "—"}
          </h3>

          {tagline ? (
            <p className="line-clamp-1 text-[11px] font-medium text-violet-700/90">
              {tagline}
            </p>
          ) : null}
        </div>

        {status === "upcoming" && startAt ? (
          <EventCardCountdown startAt={startAt} accentClass={accent.countdown} />
        ) : null}

        {status === "ongoing" ? (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/80" />
              <span className="relative size-2 rounded-full bg-emerald-500" />
            </span>
            {tStatus("ongoing")}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <MetaPill icon={Calendar} highlight={!isPast}>
            {dateLabel}
          </MetaPill>
          <MetaPill icon={isOnline ? Video : MapPin}>{locationLabel}</MetaPill>
          {isOnline ? (
            <MetaPill icon={Globe}>{tCard("online")}</MetaPill>
          ) : null}
          {doorsOpenLabel ? (
            <MetaPill icon={Clock}>
              {tCard("doorsOpen")} {doorsOpenLabel}
            </MetaPill>
          ) : null}
        </div>

        <div className="mt-auto border-t border-violet-50/90 pt-2">
          {preview ? (
            <RegisterButton
              isPast={isPast}
              registerLabel={registerLabel}
              viewDetailsLabel={tHome("viewDetails")}
            />
          ) : (
            <Link href={detailHref} className="inline-flex w-full">
              <RegisterButton
                isPast={isPast}
                registerLabel={registerLabel}
                viewDetailsLabel={tHome("viewDetails")}
              />
            </Link>
          )}
        </div>
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isPast
          ? "border-slate-200/90"
          : "border-violet-100/90 shadow-[0_12px_40px_-28px_rgba(91,33,182,0.22)]",
        !preview &&
          isVisible &&
          "motion-safe:[animation:event-card-in_0.8s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none",
        !preview &&
          !isPast &&
          "hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_22px_48px_-22px_rgba(91,33,182,0.3)]",
        preview && "pointer-events-none shadow-md",
      )}
      style={
        !preview && isVisible
          ? ({ animationDelay: `${180 + animationIndex * 140}ms` } as CSSProperties)
          : undefined
      }
    >
      {cardInner}
    </article>
  );
}

function EventCardCountdown({
  startAt,
  accentClass,
}: {
  startAt: string;
  accentClass: string;
}) {
  const tCard = useTranslations("Home.Events.card");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, new Date(startAt).getTime() - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const units = [
    { label: tCard("days"), value: days },
    { label: tCard("hours"), value: hours },
    { label: tCard("minutes"), value: minutes },
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-gradient-to-r px-3 py-1.5 ring-1",
        accentClass,
      )}
    >
      <p className="shrink-0 text-[10px] font-bold tracking-[0.1em] text-violet-600/80 uppercase">
        {tCard("startsIn")}
      </p>
      <div className="flex items-center gap-2 font-mono text-xs font-bold tabular-nums text-slate-800">
        {units.map((unit, i) => (
          <span key={unit.label} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-violet-300">·</span> : null}
            <span>
              {String(unit.value).padStart(2, "0")}
              <span className="ml-0.5 text-[8px] font-semibold text-slate-500 uppercase">
                {unit.label}
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function RegisterButton({
  isPast,
  registerLabel,
  viewDetailsLabel,
}: {
  isPast: boolean;
  registerLabel: string;
  viewDetailsLabel: string;
}) {
  return (
    <Button
      size="sm"
      type="button"
      className={cn(
        "h-10 w-full rounded-full px-5 text-xs font-semibold text-white shadow-sm transition-all duration-300 active:scale-[0.98]",
        isPast
          ? "bg-violet-500 hover:bg-violet-400"
          : "bg-brand-gradient shadow-violet-300/25 hover:brightness-105",
      )}
    >
      <span className="flex items-center justify-center gap-1.5">
        {isPast ? viewDetailsLabel : registerLabel}
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Button>
  );
}

function MetaPill({
  icon: Icon,
  children,
  highlight = false,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1",
        highlight
          ? "bg-violet-50 text-violet-700 ring-violet-200/80"
          : "bg-slate-50 text-slate-600 ring-slate-200/80",
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-75" />
      <span className="truncate">{children}</span>
    </span>
  );
}
