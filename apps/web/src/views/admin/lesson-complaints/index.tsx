"use client";

import {
  LESSON_COMPLAINT_STATUS_FILTERS,
  type LessonComplaintStatusFilter,
  type AdminLessonComplaintListItem,
  ECurrency,
  formatToCurrency,
  ROUTES,
} from "@mezon-tutors/shared";
import { Search, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  Badge,
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
  Textarea,
} from "@/components/ui";
import {
  useAdminLessonComplaints,
  useAdminLessonComplaintMetrics,
  useApproveLessonComplaint,
  useRejectLessonComplaint,
  useRequestTutorLessonComplaintReview,
} from "@/services";
import ConfirmDialog from "@/views/admin/tutor-applications/detail/components/ConfirmDialog";
import {
  ImageAttachmentGallery,
  toImageGalleryItems,
} from "@/components/common/ImageAttachmentGallery";

function formatLessonWindow(
  startAtIso: string,
  durationMinutes: number,
): { start: string; end: string } {
  const start = dayjs(startAtIso);
  const end = start.add(durationMinutes, "minute");
  return {
    start: start.format("DD/MM/YYYY HH:mm"),
    end: end.format("HH:mm"),
  };
}

type LessonComplaintCellProps = {
  lessonTypeLabel: string;
  lessonStartAt: string;
  lessonDurationMinutes: number;
  submittedAt: string;
  lessonStartLabel: string;
  lessonDurationMinutesLabel: string;
  submittedAtLabel: string;
};

function LessonComplaintCell({
  lessonTypeLabel,
  lessonStartAt,
  lessonDurationMinutes,
  submittedAt,
  lessonStartLabel,
  lessonDurationMinutesLabel,
  submittedAtLabel,
}: LessonComplaintCellProps) {
  const { start, end } = formatLessonWindow(lessonStartAt, lessonDurationMinutes);

  return (
    <div className="flex min-w-[168px] flex-col gap-3 py-0.5">
      <Badge variant="outline" className="w-fit px-2.5 py-0.5 text-[11px] font-semibold">
        {lessonTypeLabel}
      </Badge>

      <div className="space-y-1 rounded-lg py-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {lessonStartLabel}
        </p>
        <p className="text-sm font-semibold leading-snug text-slate-900">
          {start}
          <span className="mx-1 font-normal text-slate-400">–</span>
          {end}
        </p>
        <p className="text-xs text-slate-500">{lessonDurationMinutesLabel}</p>
      </div>

      <div className="space-y-1 px-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {submittedAtLabel}
        </p>
        <p className="text-sm font-medium text-slate-700">
          {dayjs(submittedAt).format("DD/MM/YYYY HH:mm")}
        </p>
      </div>
    </div>
  );
}

function filterComplaints(
  items: AdminLessonComplaintListItem[],
  search: string,
): AdminLessonComplaintListItem[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const tutorName = `${item.tutor.first_name} ${item.tutor.last_name}`.toLowerCase();
    const haystack = [
      item.student.username,
      item.student.email,
      tutorName,
      item.tutor.subject,
      item.reason,
      item.message,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PENDING") return "secondary";
  if (status === "TUTOR_REVIEW_REQUESTED") return "secondary";
  if (status === "TUTOR_CONFIRMED") return "default";
  if (status === "TUTOR_REJECTED") return "destructive";
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

export default function AdminLessonComplaintsView() {
  const t = useTranslations("Admin.LessonComplaints");
  const tFilters = useTranslations("Admin.LessonComplaints.filters");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LessonComplaintStatusFilter>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmState, setConfirmState] = useState<{
    action: "approve" | "approveWithoutTutor" | "reject";
    id: string;
  } | null>(null);

  const { data: items = [], isLoading, isFetching } = useAdminLessonComplaints(status);
  const { data: metrics } = useAdminLessonComplaintMetrics();
  const approveMutation = useApproveLessonComplaint();
  const rejectMutation = useRejectLessonComplaint();
  const requestTutorReviewMutation = useRequestTutorLessonComplaintReview();

  const filtered = useMemo(() => filterComplaints(items, search), [items, search]);

  const handleApprove = async (
    id: string,
    options?: { acknowledgeWithoutTutorConfirmation?: boolean },
  ): Promise<boolean> => {
    try {
      const result = await approveMutation.mutateAsync({
        id,
        body: {
          adminNote: notes[id]?.trim() || undefined,
          acknowledgeWithoutTutorConfirmation:
            options?.acknowledgeWithoutTutorConfirmation,
        },
      });
      toast.success(
        result.refunded
          ? t("list.approveSuccess")
          : t("list.approveSuccessNoRefund"),
      );
      return true;
    } catch (error) {
      console.error(error);
      toast.error(t("list.actionFailed"));
      return false;
    }
  };

  const handleRequestTutorReview = async (id: string): Promise<boolean> => {
    try {
      await requestTutorReviewMutation.mutateAsync(id);
      toast.success(t("list.requestTutorReviewSuccess"));
      return true;
    } catch (error) {
      console.error(error);
      toast.error(t("list.actionFailed"));
      return false;
    }
  };

  const handleReject = async (id: string): Promise<boolean> => {
    try {
      await rejectMutation.mutateAsync({
        id,
        body: { adminNote: notes[id]?.trim() || undefined },
      });
      toast.success(t("list.rejectSuccess"));
      return true;
    } catch (error) {
      console.error(error);
      toast.error(t("list.actionFailed"));
      return false;
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) {
      return;
    }

    const success =
      confirmState.action === "approve"
        ? await handleApprove(confirmState.id)
        : confirmState.action === "approveWithoutTutor"
          ? await handleApprove(confirmState.id, {
              acknowledgeWithoutTutorConfirmation: true,
            })
          : await handleReject(confirmState.id);

    if (success) {
      setConfirmState(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900">{t("title")}</h2>
        <p className="text-sm text-slate-600">{t("description")}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-violet-100">
          <CardHeader className="pb-2">
            <CardDescription>{t("metrics.totalRequests")}</CardDescription>
            <CardTitle className="text-3xl">{metrics?.total_requests ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-violet-100">
          <CardHeader className="pb-2">
            <CardDescription>{t("metrics.totalThisWeek")}</CardDescription>
            <CardTitle className="text-3xl">{metrics?.total_this_week ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-violet-100">
          <CardHeader className="pb-2">
            <CardDescription>{t("metrics.totalApproved")}</CardDescription>
            <CardTitle className="text-3xl">{metrics?.total_approved ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3 md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as LessonComplaintStatusFilter)}
          >
            <SelectTrigger className="h-10 w-40">
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
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{t("list.title")}</h3>
        <p className="text-xs text-slate-500">{t("list.subtitle", { count: filtered.length })}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("list.columns.student")}</th>
                  <th className="px-4 py-3 font-medium">{t("list.columns.tutor")}</th>
                  <th className="px-4 py-3 font-medium">{t("list.columns.lesson")}</th>
                  <th className="px-4 py-3 font-medium">{t("list.columns.reason")}</th>
                  <th className="px-4 py-3 font-medium">{t("list.columns.amount")}</th>
                  <th className="px-4 py-3 font-medium">{t("list.columns.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("list.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || isFetching ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      …
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      —
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const amountLabel =
                      item.gross_amount != null && item.currency
                        ? formatToCurrency(item.currency as ECurrency, item.gross_amount)
                        : "—";
                    const lessonTypeLabel =
                      item.lesson_type === "TRIAL"
                        ? t("list.trial")
                        : t("list.subscription");
                    const isPending = item.status === "PENDING";
                    const isTutorReviewRequested = item.status === "TUTOR_REVIEW_REQUESTED";
                    const isTutorConfirmed = item.status === "TUTOR_CONFIRMED";
                    const isTutorRejected = item.status === "TUTOR_REJECTED";
                    const isReviewable =
                      isPending ||
                      isTutorReviewRequested ||
                      isTutorConfirmed ||
                      isTutorRejected;
                    const needsTutorOverrideApprove = isPending || isTutorReviewRequested;
                    const busy =
                      approveMutation.isPending ||
                      rejectMutation.isPending ||
                      requestTutorReviewMutation.isPending;

                    return (
                      <tr key={item.id} className="border-t align-top">
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{item.student.username}</p>
                            <p className="text-xs text-muted-foreground">{item.student.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <Link
                              href={ROUTES.ADMIN.TUTOR_APPLICATION_DETAIL(item.tutor.id)}
                              className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/90"
                            >
                              {item.tutor.first_name} {item.tutor.last_name}
                              <SquareArrowOutUpRight
                                className="size-3.5 shrink-0"
                                aria-hidden
                              />
                            </Link>
                            <p className="text-xs text-muted-foreground">{item.tutor.subject}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <LessonComplaintCell
                            lessonTypeLabel={lessonTypeLabel}
                            lessonStartAt={item.lesson_start_at}
                            lessonDurationMinutes={item.lesson_duration_minutes}
                            submittedAt={item.created_at}
                            lessonStartLabel={t("list.lessonStart")}
                            lessonDurationMinutesLabel={t("list.lessonDuration", {
                              minutes: item.lesson_duration_minutes,
                            })}
                            submittedAtLabel={t("list.submittedAt")}
                          />
                        </td>
                        <td className="max-w-[280px] px-4 py-3">
                          <p className="font-medium">{item.reason}</p>
                          {item.message ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                              {item.message}
                            </p>
                          ) : null}
                          {item.attachment_urls.length > 0 ? (
                            <div className="mt-3">
                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {t("list.attachments")}
                              </p>
                              <ImageAttachmentGallery
                                images={toImageGalleryItems(item.attachment_urls)}
                              />
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{amountLabel}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(item.status)}>
                            {tFilters(item.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isReviewable ? (
                            <div className="flex min-w-[200px] flex-col gap-2">
                              {isPending ? (
                                <p className="text-xs text-amber-700">
                                  {t("list.awaitingAdminReview")}
                                </p>
                              ) : null}
                              {isTutorReviewRequested ? (
                                <p className="text-xs text-amber-700">
                                  {t("list.awaitingTutorConfirmation")}
                                </p>
                              ) : null}
                              {isTutorRejected ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-rose-700">
                                    {t("list.tutorRejectedHint")}
                                  </p>
                                  {item.tutor_note ? (
                                    <p className="text-xs text-rose-600">{item.tutor_note}</p>
                                  ) : null}
                                </div>
                              ) : null}
                              <Textarea
                                rows={2}
                                placeholder={t("list.adminNotePlaceholder")}
                                value={notes[item.id] ?? ""}
                                onChange={(e) =>
                                  setNotes((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                              />
                              <div className="flex flex-wrap gap-2">
                                {isPending ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() => void handleRequestTutorReview(item.id)}
                                  >
                                    {t("list.requestTutorReview")}
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirmState({
                                      action: needsTutorOverrideApprove
                                        ? "approveWithoutTutor"
                                        : "approve",
                                      id: item.id,
                                    })
                                  }
                                >
                                  {t("list.approve")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirmState({ action: "reject", id: item.id })
                                  }
                                >
                                  {t("list.reject")}
                                </Button>
                              </div>
                            </div>
                          ) : item.admin_note ? (
                            <p className="text-xs text-muted-foreground">{item.admin_note}</p>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState?.action === "approve"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState((current) =>
              current?.action === "approve" ? null : current,
            );
          }
        }}
        title={t("list.confirmApprove.title")}
        description={t("list.confirmApprove.description")}
        confirmLabel={t("list.confirmApprove.confirm")}
        cancelLabel={t("list.confirmApprove.cancel")}
        loading={approveMutation.isPending}
        onConfirm={handleConfirmAction}
      />
      <ConfirmDialog
        open={confirmState?.action === "approveWithoutTutor"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState((current) =>
              current?.action === "approveWithoutTutor" ? null : current,
            );
          }
        }}
        title={t("list.confirmApproveWithoutTutor.title")}
        description={t("list.confirmApproveWithoutTutor.description")}
        confirmLabel={t("list.confirmApproveWithoutTutor.confirm")}
        cancelLabel={t("list.confirmApproveWithoutTutor.cancel")}
        loading={approveMutation.isPending}
        onConfirm={handleConfirmAction}
      />
      <ConfirmDialog
        open={confirmState?.action === "reject"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState((current) =>
              current?.action === "reject" ? null : current,
            );
          }
        }}
        title={t("list.confirmReject.title")}
        description={t("list.confirmReject.description")}
        confirmLabel={t("list.confirmReject.confirm")}
        cancelLabel={t("list.confirmReject.cancel")}
        variant="destructive"
        loading={rejectMutation.isPending}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
