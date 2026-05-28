"use client";

import {
  LESSON_COMPLAINT_STATUS_FILTERS,
  type LessonComplaintStatusFilter,
  type StudentLessonComplaintItem,
} from "@mezon-tutors/shared";
import { CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { useGetMyLessonComplaints } from "@/services/lesson-complaint/lesson-complaint.api";

const STATUS_STYLES: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
    cardClass: string;
  }
> = {
  PENDING: {
    icon: Clock3,
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    cardClass:
      "border-amber-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)]",
  },
  APPROVED: {
    icon: CheckCircle2,
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    cardClass:
      "border-emerald-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff9_100%)]",
  },
  REJECTED: {
    icon: XCircle,
    badgeClass:
      "border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    cardClass:
      "border-rose-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff6f7_100%)]",
  },
};

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PENDING") return "secondary";
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

function filterComplaints(
  items: StudentLessonComplaintItem[],
  search: string,
  status: LessonComplaintStatusFilter,
): StudentLessonComplaintItem[] {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    if (!q) return true;
    const tutorName = `${item.tutor.first_name} ${item.tutor.last_name}`.toLowerCase();
    const haystack = [item.reason, item.message, tutorName, item.tutor.subject]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export default function MyComplaintsView() {
  const t = useTranslations("Dashboard.complaintsPage");
  const tFilters = useTranslations("Dashboard.complaintsPage.filters");
  const tStatus = useTranslations("Dashboard.complaintsPage.status");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LessonComplaintStatusFilter>("all");
  const { data: complaints = [], isLoading, isFetching } = useGetMyLessonComplaints();

  const filtered = useMemo(
    () => filterComplaints(complaints, search, status),
    [complaints, search, status],
  );

  const metrics = useMemo(() => {
    const pending = complaints.filter((c) => c.status === "PENDING").length;
    const approved = complaints.filter((c) => c.status === "APPROVED").length;
    const rejected = complaints.filter((c) => c.status === "REJECTED").length;
    return { pending, approved, rejected };
  }, [complaints]);

  return (
    <div className="flex flex-col gap-7 px-4 py-6 md:px-7 md:py-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-amber-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-700">{t("metrics.pending")}</CardDescription>
            <CardTitle className="text-3xl text-amber-800">{metrics.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff9_100%)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700">{t("metrics.approved")}</CardDescription>
            <CardTitle className="text-3xl text-emerald-800">{metrics.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-rose-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff6f7_100%)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-700">{t("metrics.rejected")}</CardDescription>
            <CardTitle className="text-3xl text-rose-800">{metrics.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-violet-100">
        <CardHeader className="gap-1">
          <CardTitle className="text-xl font-extrabold tracking-tight text-slate-900">
            {t("list.title")}
          </CardTitle>
          <CardDescription>{t("list.subtitle", { count: filtered.length })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 rounded-xl border-violet-100 bg-violet-50/50 pl-9 text-sm text-slate-700 focus-visible:bg-white"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as LessonComplaintStatusFilter)}
            >
              <SelectTrigger className="h-11 min-h-11 w-full rounded-xl border-violet-100 bg-violet-50/50 px-3.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-200 focus:ring-offset-0 sm:w-[190px]">
                <SelectValue>{tFilters(status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LESSON_COMPLAINT_STATUS_FILTERS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {tFilters(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading || isFetching ? (
            <div className="rounded-xl border border-dashed border-violet-100 bg-violet-50/40 px-4 py-12 text-center text-sm text-slate-500">
              {t("loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-100 bg-violet-50/40 px-4 py-12 text-center">
              <p className="text-base font-semibold text-slate-800">{t("emptyTitle")}</p>
              <p className="mt-2 text-sm text-slate-500">{t("emptyDescription")}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((item) => {
                const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.PENDING;
                const StatusIcon = style.icon;

                return (
                  <Card key={item.id} className={style.cardClass}>
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.tutor.first_name} {item.tutor.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{item.tutor.subject}</p>
                        </div>
                        <Badge variant={statusVariant(item.status)} className={style.badgeClass}>
                          <StatusIcon className="mr-1.5 size-3.5" />
                          {tStatus(item.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 text-xs text-slate-600 sm:grid-cols-2 sm:gap-x-6">
                        <p>
                          <span className="font-semibold">{t("list.lessonTime")}:</span>{" "}
                          {dayjs(item.lesson_start_at).format("DD/MM/YYYY HH:mm")}
                        </p>
                        <p>
                          <span className="font-semibold">{t("list.submittedAt")}:</span>{" "}
                          {dayjs(item.created_at).format("DD/MM/YYYY HH:mm")}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <p className="text-xs font-semibold text-slate-700">{t("list.reason")}</p>
                        <p className="mt-1.5 text-sm text-slate-700">{item.reason}</p>
                        {item.message ? (
                          <p className="mt-2 text-xs text-slate-500">{item.message}</p>
                        ) : null}
                      </div>

                      {item.admin_note ? (
                        <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5">
                          <p className="text-xs font-semibold text-violet-700">
                            {t("list.adminNote")}
                          </p>
                          <p className="mt-1.5 text-sm text-violet-800">{item.admin_note}</p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
