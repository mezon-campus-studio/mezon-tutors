"use client";

import {
  EVENT_PUBLISH_STATUS_FILTERS,
  ROUTES,
  type EventPublishStatusFilter,
} from "@mezon-tutors/shared";
import { CalendarDays, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { pickEventContent } from "@/lib/event-view";
import { useAdminEventMetrics, useAdminEvents } from "@/services";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  PUBLISHED: "default",
  REJECTED: "destructive",
  CLOSED: "outline",
};

export default function AdminEventsView() {
  const t = useTranslations("Admin.Events");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EventPublishStatusFilter>("PENDING");
  const { data: events = [], isLoading } = useAdminEvents(status);
  const { data: metrics } = useAdminEventMetrics();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) => {
      const content = event.content.vi;
      return (
        event.slug.toLowerCase().includes(query) ||
        content.title.toLowerCase().includes(query) ||
        content.tagline.toLowerCase().includes(query)
      );
    });
  }, [events, search]);

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6 lg:p-8">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard title={t("metrics.pending")} value={metrics?.pending ?? 0} />
        <MetricCard title={t("metrics.pendingUpdates")} value={metrics?.pendingUpdates ?? 0} />
        <MetricCard title={t("metrics.published")} value={metrics?.published ?? 0} />
        <MetricCard title={t("metrics.closed")} value={metrics?.closed ?? 0} />
        <MetricCard title={t("metrics.rejected")} value={metrics?.rejected ?? 0} />
        <MetricCard title={t("metrics.total")} value={metrics?.total ?? 0} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as EventPublishStatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>{(value: string) => t(`statusFilter.${value}`)}</SelectValue>
            </SelectTrigger>
          <SelectContent>
            {EVENT_PUBLISH_STATUS_FILTERS.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`statusFilter.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-500">{t("loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">{t("empty")}</p>
          ) : (
            filtered.map((event) => {
              const content = pickEventContent(event, "vi");
              return (
                <Link
                  key={event.id}
                  href={ROUTES.ADMIN.EVENT_DETAIL(event.id)}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {content.title.replace(/\n/g, " ")}
                      </p>
                      <Badge variant={STATUS_VARIANT[event.publishStatus] ?? "outline"}>
                        {t(`publishStatus.${event.publishStatus}`)}
                      </Badge>
                      {event.updateReviewStatus === "PENDING" ? (
                        <Badge variant="secondary">{t("publishStatus.UPDATE_PENDING")}</Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">{content.tagline}</p>
                    <p className="text-[11px] text-slate-400">
                      {dayjs(event.startAt).format("DD/MM/YYYY HH:mm")} · /events/{event.slug}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-700">
                    <CalendarDays className="size-4" />
                    {t("list.review")}
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
