"use client";

import {
  LESSON_COMPLAINT_STATUS_FILTERS,
  type LessonComplaintStatusFilter,
  type StudentLessonComplaintItem,
} from "@mezon-tutors/shared";
import {
  CheckCircle2,
  Clock3,
  Inbox,
  MessageCircle,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import {
  Button,
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
import { useOpenAdminSupportChat } from "@/hooks";
import { useGetMyLessonComplaints } from "@/services/lesson-complaint/lesson-complaint.api";
import {
  ImageAttachmentGallery,
  toImageGalleryItems,
} from "@/components/common/ImageAttachmentGallery";
import { ComplaintListItemBody } from "@/views/main/lesson-complaints/components/ComplaintListItemBody";
import { ComplaintStatusFilterLabel } from "@/views/main/lesson-complaints/components/ComplaintStatusFilterLabel";

const STATUS_STYLES: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
    iconClass: string;
    cardClass: string;
    accentClass: string;
    panelClass: string;
  }
> = {
  PENDING: {
    icon: Clock3,
    badgeClass: "bg-sky-50 text-sky-700 ring-sky-200",
    iconClass: "text-sky-500",
    accentClass: "border-l-sky-400",
    cardClass: "border-sky-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f0f9ff_100%)]",
    panelClass: "border-sky-100/80 bg-white/90 shadow-sky-100/40",
  },
  TUTOR_REVIEW_REQUESTED: {
    icon: Clock3,
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
    iconClass: "text-amber-500",
    accentClass: "border-l-amber-400",
    cardClass: "border-amber-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)]",
    panelClass: "border-amber-100/80 bg-white/90 shadow-amber-100/40",
  },
  TUTOR_CONFIRMED: {
    icon: Clock3,
    badgeClass: "bg-violet-50 text-violet-700 ring-violet-200",
    iconClass: "text-violet-500",
    accentClass: "border-l-violet-400",
    cardClass: "border-violet-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)]",
    panelClass: "border-violet-100/80 bg-white/90 shadow-violet-100/40",
  },
  TUTOR_REJECTED: {
    icon: XCircle,
    badgeClass: "bg-rose-50 text-rose-700 ring-rose-200",
    iconClass: "text-rose-500",
    accentClass: "border-l-rose-400",
    cardClass: "border-rose-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff6f7_100%)]",
    panelClass: "border-rose-100/80 bg-white/90 shadow-rose-100/40",
  },
  APPROVED: {
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    iconClass: "text-emerald-500",
    accentClass: "border-l-emerald-400",
    cardClass: "border-emerald-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff9_100%)]",
    panelClass: "border-emerald-100/80 bg-white/90 shadow-emerald-100/40",
  },
  REJECTED: {
    icon: XCircle,
    badgeClass: "bg-rose-50 text-rose-700 ring-rose-200",
    iconClass: "text-rose-500",
    accentClass: "border-l-rose-400",
    cardClass: "border-rose-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff6f7_100%)]",
    panelClass: "border-rose-100/80 bg-white/90 shadow-rose-100/40",
  },
};

const FILTER_STATUS_STYLES: Record<
  LessonComplaintStatusFilter,
  { dotClass: string; textClass: string }
> = {
  all: { dotClass: "bg-violet-400", textClass: "text-slate-700" },
  PENDING: { dotClass: "bg-sky-400", textClass: "text-sky-700" },
  TUTOR_REVIEW_REQUESTED: { dotClass: "bg-amber-400", textClass: "text-amber-700" },
  TUTOR_CONFIRMED: { dotClass: "bg-violet-400", textClass: "text-violet-700" },
  TUTOR_REJECTED: { dotClass: "bg-rose-400", textClass: "text-rose-700" },
  APPROVED: { dotClass: "bg-emerald-400", textClass: "text-emerald-700" },
  REJECTED: { dotClass: "bg-rose-400", textClass: "text-rose-700" },
};

function StatusFilterLabel({
  filterKey,
  label,
}: {
  filterKey: LessonComplaintStatusFilter;
  label: string;
}) {
  const style = FILTER_STATUS_STYLES[filterKey];

  return (
    <span className={`flex items-center gap-2 ${style.textClass}`}>
      <span className={`size-2 shrink-0 rounded-full ${style.dotClass}`} />
      <span>{label}</span>
    </span>
  );
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
  const { openAdminSupportChat, isOpening: isOpeningSupportChat } = useOpenAdminSupportChat();

  const filtered = useMemo(
    () => filterComplaints(complaints, search, status),
    [complaints, search, status],
  );

  const metrics = useMemo(() => {
    const pending = complaints.filter(
      (c) =>
        c.status === "PENDING" ||
        c.status === "TUTOR_REVIEW_REQUESTED" ||
        c.status === "TUTOR_CONFIRMED",
    ).length;
    const approved = complaints.filter((c) => c.status === "APPROVED").length;
    const rejected = complaints.filter(
      (c) => c.status === "REJECTED" || c.status === "TUTOR_REJECTED",
    ).length;
    return { pending, approved, rejected };
  }, [complaints]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-5 md:gap-6">
          <header className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
          </header>

          <Card className="min-w-0 border-violet-100 shadow-sm">
            <CardHeader className="gap-4 border-b border-violet-50 px-4 pb-4 pt-5 sm:px-6">
              <div className="min-w-0">
                <CardTitle className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                  {t("list.title")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("list.subtitle", { count: filtered.length })}
                </CardDescription>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-violet-50/60 p-2.5 sm:gap-3 sm:p-3">
                <div className="min-w-0 text-center sm:text-left">
                  <p className="truncate text-[10px] font-semibold text-amber-700 sm:text-xs">
                    {t("metrics.pending")}
                  </p>
                  <p className="text-xl font-extrabold text-amber-800 sm:text-2xl">
                    {metrics.pending}
                  </p>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <p className="truncate text-[10px] font-semibold text-emerald-700 sm:text-xs">
                    {t("metrics.approved")}
                  </p>
                  <p className="text-xl font-extrabold text-emerald-800 sm:text-2xl">
                    {metrics.approved}
                  </p>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <p className="truncate text-[10px] font-semibold text-rose-700 sm:text-xs">
                    {t("metrics.rejected")}
                  </p>
                  <p className="text-xl font-extrabold text-rose-800 sm:text-2xl">
                    {metrics.rejected}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 rounded-xl border-violet-100 bg-white pl-9 text-sm text-slate-700"
                    placeholder={t("searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as LessonComplaintStatusFilter)}
                >
                  <SelectTrigger className="h-11 min-h-11 w-full rounded-xl border-violet-100 bg-white px-3.5 text-sm font-medium sm:w-[200px] lg:w-[220px]">
                    <SelectValue>
                      <ComplaintStatusFilterLabel filterKey={status} label={tFilters(status)} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LESSON_COMPLAINT_STATUS_FILTERS.map((key) => (
                      <SelectItem key={key} value={key}>
                        <ComplaintStatusFilterLabel filterKey={key} label={tFilters(key)} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
              {isLoading || isFetching ? (
                <div className="rounded-2xl border border-dashed border-violet-100 bg-violet-50/40 px-4 py-12 text-center text-sm text-slate-500">
                  {t("loading")}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf8ff_0%,#ffffff_100%)] px-4 py-10 text-center sm:py-12">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <Inbox className="size-6" />
                  </div>
                  <p className="text-base font-semibold text-slate-800 sm:text-lg">
                    {t("emptyTitle")}
                  </p>
                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    {t("emptyDescription")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filtered.map((item) => {
                    const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.PENDING;
                    const showSupport =
                      item.status === "REJECTED" || item.status === "TUTOR_REJECTED";

                    return (
                      <Card
                        key={item.id}
                        className={`min-w-0 overflow-hidden border-l-4 ${style.accentClass} ${style.cardClass}`}
                      >
                        <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-5">
                      <ComplaintListItemBody
                        title={`${item.tutor.first_name} ${item.tutor.last_name}`}
                        subtitle={item.tutor.subject}
                        statusLabel={tStatus(item.status)}
                        statusIcon={style.icon}
                        badgeClassName={style.badgeClass}
                        statusIconClassName={style.iconClass}
                        panelClassName={style.panelClass}
                        lessonTimeLabel={t("list.lessonTime")}
                        lessonTimeValue={dayjs(item.lesson_start_at).format("DD/MM/YYYY HH:mm")}
                        submittedLabel={t("list.submittedAt")}
                        submittedValue={dayjs(item.created_at).format("DD/MM/YYYY HH:mm")}
                        reasonLabel={t("list.reason")}
                        reason={item.reason}
                        message={item.message}
                        attachments={
                          item.attachment_urls.length > 0 ? (
                            <>
                              <p className="mb-2 text-xs font-semibold text-slate-600">
                                {t("list.attachments")}
                              </p>
                              <ImageAttachmentGallery
                                images={toImageGalleryItems(item.attachment_urls)}
                              />
                            </>
                          ) : undefined
                        }
                      />

                      {item.tutor_note ? (
                        <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2.5">
                          <p className="text-xs font-semibold text-rose-700">
                            {t("list.tutorNote")}
                          </p>
                          <p className="mt-1.5 text-sm text-rose-800">{item.tutor_note}</p>
                        </div>
                      ) : null}

                      {item.admin_note ? (
                        <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5">
                          <p className="text-xs font-semibold text-violet-700">
                            {t("list.adminNote")}
                          </p>
                          <p className="mt-1.5 text-sm text-violet-800">{item.admin_note}</p>
                        </div>
                      ) : null}

                          {showSupport ? (
                            <Button
                              variant="outline"
                              className="h-11 w-full rounded-full border-violet-200 text-sm font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50 sm:h-10 sm:w-auto"
                              onClick={() => void openAdminSupportChat()}
                              disabled={isOpeningSupportChat}
                            >
                              <MessageCircle className="mr-2 size-4" />
                              {isOpeningSupportChat
                                ? t("list.openingSupportChat")
                                : t("list.contactSupport")}
                            </Button>
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
      </div>
    </div>
  );
}
