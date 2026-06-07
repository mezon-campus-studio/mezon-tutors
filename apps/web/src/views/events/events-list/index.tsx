"use client";

import type { EventStatus } from "@mezon-tutors/shared";
import { ROUTES } from "@mezon-tutors/shared";
import { ArrowLeft, CalendarDays, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EventListRow } from "@/components/events/EventListRow";
import { Button, Skeleton } from "@/components/ui";
import { sortPublishedEvents } from "@/lib/event-sort";
import { cn } from "@/lib/utils";
import { usePublishedEvents } from "@/services";

type StatusFilter = "all" | EventStatus;

const FILTER_OPTIONS: StatusFilter[] = ["all", "upcoming", "ongoing", "past"];

export default function EventsListPage() {
  const t = useTranslations("Events.list");
  const tHome = useTranslations("Home.Events");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { data: events = [], isLoading } = usePublishedEvents();

  const sortedEvents = useMemo(() => sortPublishedEvents(events), [events]);

  const filteredEvents = useMemo(() => {
    if (statusFilter === "all") return sortedEvents;
    return sortedEvents.filter((event) => event.lifecycleStatus === statusFilter);
  }, [sortedEvents, statusFilter]);

  const counts = useMemo(
    () => ({
      all: sortedEvents.length,
      upcoming: sortedEvents.filter((e) => e.lifecycleStatus === "upcoming").length,
      ongoing: sortedEvents.filter((e) => e.lifecycleStatus === "ongoing").length,
      past: sortedEvents.filter((e) => e.lifecycleStatus === "past").length,
    }),
    [sortedEvents],
  );

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#faf9ff_0%,#ffffff_38%,#f8f6ff_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.14),transparent)]" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-6 py-8 sm:py-10 lg:px-8">
        <Link
          href={ROUTES.HOME.index}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
        >
          <ArrowLeft className="size-4" />
          {t("backHome")}
        </Link>

        <header className="mb-8 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
            <Sparkles className="size-3.5" />
            {t("badge")}
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              {t("subtitle")}
            </p>
          </div>
          {!isLoading && sortedEvents.length > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700/80">
              <CalendarDays className="size-4" />
              {t("count", { count: filteredEvents.length })}
            </p>
          ) : null}
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((filter) => {
            const count =
              filter === "all" ? counts.all : counts[filter];
            if (filter !== "all" && count === 0) return null;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition-all",
                  statusFilter === filter
                    ? "bg-violet-600 text-white ring-violet-600 shadow-sm shadow-violet-300/40"
                    : "bg-white text-slate-600 ring-violet-100 hover:bg-violet-50 hover:text-violet-800",
                )}
              >
                {t(`filters.${filter}`)}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                    statusFilter === filter
                      ? "bg-white/20 text-white"
                      : "bg-violet-50 text-violet-700",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`event-skeleton-${index}`}
                className="overflow-hidden rounded-2xl border border-violet-100 bg-white p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Skeleton className="h-36 w-full rounded-xl sm:h-32 sm:w-48" />
                  <div className="flex flex-1 flex-col gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="mt-auto flex gap-2 pt-2">
                      <Skeleton className="h-8 w-28 rounded-full" />
                      <Skeleton className="h-8 w-28 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 px-6 py-14 text-center">
            <p className="text-lg font-bold text-slate-900">{t("empty.title")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {t("empty.description")}
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 rounded-full border-violet-200"
            >
              <Link href={ROUTES.HOME.index}>{t("backHome")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <EventListRow
                key={event.id}
                event={event}
                priceFallback={tHome("priceFree")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
