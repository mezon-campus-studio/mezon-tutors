"use client";

import {
  LESSON_COMPLAINT_STATUS_FILTERS,
  type LessonComplaintStatusFilter,
  type StudentLessonComplaintItem,
} from "@mezon-tutors/shared";
import { CheckCircle2, Clock3, MessageCircle, Search, XCircle } from "lucide-react";
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
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    cardClass: "border-amber-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)]",
  },
  TUTOR_CONFIRMED: {
    icon: Clock3,
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-violet-100",
    cardClass: "border-violet-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)]",
  },
  TUTOR_REJECTED: {
    icon: XCircle,
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    cardClass: "border-rose-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff6f7_100%)]",
  },
  APPROVED: {
    icon: CheckCircle2,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    cardClass: "border-emerald-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff9_100%)]",
  },
  REJECTED: {
    icon: XCircle,
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    cardClass: "border-rose-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff6f7_100%)]",
  },
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PENDING") return "secondary";
  if (status === "TUTOR_CONFIRMED") return "default";
  if (status === "TUTOR_REJECTED") return "destructive";
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
  const { openAdminSupportChat, isOpening: isOpeningSupportChat } = useOpenAdminSupportChat();

  const filtered = useMemo(
    () => filterComplaints(complaints, search, status),
    [complaints, search, status],
  );

  const metrics = useMemo(() => {
    const pending = complaints.filter(
      (c) => c.status === "PENDING" || c.status === "TUTOR_CONFIRMED",
    ).length;
    const approved = complaints.filter((c) => c.status === "APPROVED").length;
    const rejected = complaints.filter(
      (c) => c.status === "REJECTED" || c.status === "TUTOR_REJECTED",
    ).length;
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

      <Card className="border-violet-100 shadow-sm">
        <CardHeader className="gap-4 border-b border-violet-50 pb-4">
          <div>
            <CardTitle className="text-xl font-extrabold tracking-tight text-slate-900">
              {t("list.title")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("list.subtitle", { count: filtered.length })}
            </CardDescription>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-violet-50/60 p-3">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold text-amber-700">{t("metrics.pending")}</p>
              <p className="text-2xl font-extrabold text-amber-800">{metrics.pending}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold text-emerald-700">{t("metrics.approved")}</p>
              <p className="text-2xl font-extrabold text-emerald-800">{metrics.approved}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold text-rose-700">{t("metrics.rejected")}</p>
              <p className="text-2xl font-extrabold text-rose-800">{metrics.rejected}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
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
              <SelectTrigger className="h-11 min-h-11 w-full rounded-xl border-violet-100 bg-white px-3.5 text-sm font-medium text-slate-700 sm:w-[190px]">
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
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
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
            <div className="space-y-4">
              {filtered.map((item) => {
                const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.PENDING;
                const showSupport =
                  item.status === "REJECTED" || item.status === "TUTOR_REJECTED";

                return (
                  <Card key={item.id} className={style.cardClass}>
                    <CardContent className="space-y-3 p-4 md:p-5">
                      <ComplaintListItemBody
                        title={`${item.tutor.first_name} ${item.tutor.last_name}`}
                        subtitle={item.tutor.subject}
                        statusLabel={tStatus(item.status)}
                        statusIcon={style.icon}
                        statusVariant={statusVariant(item.status)}
                        badgeClassName={style.badgeClass}
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
                          className="h-10 w-full rounded-full border-violet-200 text-sm font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50 sm:w-auto"
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
  );
}
