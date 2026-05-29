"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle, CircleDollarSign, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Label,
} from "@/components/ui";
import type { LessonItem } from "@/services/my-lessons/my-lessons.api";
import { formatLessonDateLabel } from "@/components/calendar/utils/format-locale";
import { ECurrency, formatToCurrency } from "@mezon-tutors/shared";
import { isTrialLessonRefundEligible } from "@/lib/trial-lesson-cancellation";

export type TrialCancelLessonTarget = {
  id: string;
  source?: "trial" | "subscription";
  peerName: string;
  peerAvatarUrl?: string;
  dateLabel: string;
  timeLabel: string;
  subject: string;
  startAt: string;
  grossAmount?: number;
  currency?: string;
};

type CancelLessonDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, message?: string) => void;
  isLoading?: boolean;
  lesson: LessonItem | TrialCancelLessonTarget | null;
  /** Student self-cancel (refund policy) vs tutor cancellation request to student. */
  variant?: "student" | "tutor";
  /** Trial vs subscription — affects tutor dialog title only. */
  lessonKind?: "trial" | "subscription";
};

function resolveCurrency(code?: string): ECurrency {
  if (code === ECurrency.USD || code === ECurrency.PHP || code === ECurrency.VND) {
    return code;
  }
  return ECurrency.VND;
}

function lessonToTarget(
  lesson: LessonItem | TrialCancelLessonTarget,
): TrialCancelLessonTarget {
  if ("peerName" in lesson) {
    return lesson;
  }
  return {
    id: lesson.id,
    source: lesson.source,
    peerName: lesson.tutor,
    peerAvatarUrl: lesson.tutorAvatar,
    dateLabel: lesson.dateLabel,
    timeLabel: lesson.timeLabel,
    subject: lesson.subject,
    startAt: lesson.startAt ?? "",
    grossAmount: lesson.grossAmount,
    currency: lesson.currency,
  };
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
};

export function CancelLessonDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  lesson,
  variant = "student",
  lessonKind,
}: CancelLessonDialogProps) {
  const locale = useLocale();
  const isTutor = variant === "tutor";
  const isSubscription =
    lessonKind === "subscription" ||
    (lesson != null && "source" in lesson && lesson.source === "subscription");
  const t = useTranslations("MyLessons.panels.lessons.cancellation");
  const tSubscription = useTranslations(
    "MyLessons.panels.lessons.subscription.cancellation",
  );
  const tTutor = useTranslations("Dashboard.bookingRequests.cancellation.dialog");
  const tTutorReasons = useTranslations("Dashboard.bookingRequests.reschedule.reasons");
  const tPolicy = isSubscription ? tSubscription : t;
  const [reason, setReason] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const target = useMemo(
    () => (lesson ? lessonToTarget(lesson) : null),
    [lesson],
  );

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setMessage("");
    }
  }, [isOpen]);

  const refundPolicy = useMemo(() => {
    if (isTutor || !target?.startAt) {
      return null;
    }
    if (isSubscription) {
      return { eligible: false, amountLabel: null, noRefundAlways: true };
    }
    const eligible = isTrialLessonRefundEligible(target.startAt);
    const amountLabel =
      target.grossAmount != null && target.currency
        ? formatToCurrency(resolveCurrency(target.currency), target.grossAmount)
        : target.grossAmount != null
          ? formatToCurrency(ECurrency.VND, target.grossAmount)
          : null;

    return { eligible, amountLabel, noRefundAlways: false };
  }, [target, isSubscription, isTutor]);

  const reasons = useMemo(() => {
    if (isTutor) {
      return [
        { value: "scheduleConflict", label: tTutorReasons("scheduleConflict") },
        { value: "personalEmergency", label: tTutorReasons("personalEmergency") },
        { value: "studentUnavailable", label: tTutorReasons("studentUnavailable") },
        { value: "other", label: tTutorReasons("other") },
      ];
    }
    return [
      { value: "timeNotWork", label: t("reasons.timeNotWork") },
      { value: "technicalIssue", label: t("reasons.technicalIssue") },
      { value: "avoidBalanceLoss", label: t("reasons.avoidBalanceLoss") },
      { value: "notMotivated", label: t("reasons.notMotivated") },
      { value: "tutorRescheduledUnavail", label: t("reasons.tutorRescheduledUnavail") },
      { value: "tutorAskedCancel", label: t("reasons.tutorAskedCancel") },
      { value: "noLongerLearnTutor", label: t("reasons.noLongerLearnTutor") },
      { value: "other", label: t("reasons.other") },
    ];
  }, [isTutor, t, tTutorReasons]);

  const dialogTitle = isTutor
    ? isSubscription
      ? tTutor("titleSubscription")
      : tTutor("title")
    : isSubscription
      ? tSubscription("dialog.title")
      : t("dialog.title");

  const handleConfirm = () => {
    if (reason) {
      onConfirm(reason, message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[460px] gap-0 overflow-hidden border-violet-100 p-0 shadow-xl shadow-violet-200/40">
        <DialogHeader className="border-b border-violet-50 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-5 py-4">
          <DialogTitle className="font-heading text-lg font-extrabold text-slate-900">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        {target && (
          <>
            <div className="flex max-h-[min(70vh,520px)] flex-col gap-3 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3 rounded-2xl border border-violet-100/80 bg-violet-50/30 px-3 py-3">
                <Avatar className="size-12 shrink-0 rounded-xl border border-violet-100">
                  {target.peerAvatarUrl ? (
                    <AvatarImage
                      src={target.peerAvatarUrl}
                      alt={target.peerName}
                      className="rounded-lg object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
                    {getInitials(target.peerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">
                    {target.peerName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">
                    <span className="font-semibold text-violet-600">
                      {formatLessonDateLabel(target.dateLabel, locale)}
                    </span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="font-bold text-slate-700">{target.timeLabel}</span>
                  </p>
                  {target.subject ? (
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                      {target.subject}
                    </p>
                  ) : null}
                </div>
              </div>

              {isTutor ? (
                <div className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Info className="size-4" />
                  </div>
                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-600">
                    {tTutor("policyHint")}
                  </p>
                </div>
              ) : refundPolicy ? (
                <div
                  className={
                    refundPolicy.eligible
                      ? "rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5"
                      : "rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5"
                  }
                >
                  <div className="flex gap-3">
                    <div
                      className={
                        refundPolicy.eligible
                          ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"
                          : "flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
                      }
                    >
                      {refundPolicy.eligible ? (
                        <CircleDollarSign className="size-4" />
                      ) : (
                        <AlertTriangle className="size-4" />
                      )}
                    </div>
                    <p
                      className={
                        refundPolicy.eligible
                          ? "min-w-0 flex-1 text-sm leading-relaxed text-emerald-900"
                          : "min-w-0 flex-1 text-sm leading-relaxed text-amber-900"
                      }
                    >
                      {refundPolicy.noRefundAlways
                        ? tPolicy("dialog.policy.noRefundDescription")
                        : refundPolicy.eligible
                        ? refundPolicy.amountLabel
                          ? tPolicy("dialog.policy.eligibleDescription", {
                              amount: refundPolicy.amountLabel,
                            })
                          : tPolicy("dialog.policy.eligibleDescriptionNoAmount")
                        : tPolicy("dialog.policy.notEligibleDescription")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Info className="size-4" />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {tPolicy("dialog.policy.fallback")}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="mb-2 text-xs font-semibold text-slate-900">
                  {isTutor ? tTutor("reasonLabel") : t("dialog.reasonLabel")}
                </Label>
                <Select value={reason} onValueChange={(val) => setReason(val ?? "")}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-violet-100 bg-white px-3.5 text-sm text-slate-700 focus:ring-2 focus:ring-violet-200">
                    <SelectValue
                      placeholder={
                        isTutor ? tTutor("reasonPlaceholder") : t("dialog.reasonPlaceholder")
                      }
                    >
                      {reasons.find((r) => r.value === reason)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {reasons.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="py-2">
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="mb-2 text-xs font-semibold text-slate-900">
                  {isTutor
                    ? tTutor("messageLabel", { student: target.peerName })
                    : t("dialog.messageLabel", { tutor: target.peerName })}
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isTutor ? tTutor("messagePlaceholder") : t("dialog.messagePlaceholder")
                  }
                  className="min-h-[88px] resize-none rounded-xl border-violet-100 bg-white p-3 text-sm text-slate-700 focus-visible:ring-2 focus-visible:ring-violet-200"
                />
              </div>
            </div>

            <DialogFooter className="m-0 flex gap-2.5 border-t border-violet-50 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-5 pt-3.5 pb-5 sm:flex-row">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-full border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 sm:order-1"
                onClick={onClose}
                disabled={isLoading}
              >
                {isTutor ? tTutor("dismiss") : t("dialog.dismiss")}
              </Button>
              <Button
                className="h-11 flex-1 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-bold text-white shadow-md shadow-violet-300/40 transition-all hover:opacity-90 sm:order-2"
                disabled={!reason || isLoading}
                onClick={handleConfirm}
              >
                {isTutor ? tTutor("confirm") : t("dialog.confirm")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
