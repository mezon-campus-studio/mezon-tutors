"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3, Flag, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui";
import { formatLessonDateLabel } from "@/components/calendar/utils/format-locale";
import type { LessonItem } from "@/services/my-lessons/my-lessons.api";
import { LESSON_COMPLAINT_REASON_KEYS, LESSON_COMPLAINT_WINDOW_HOURS, type LessonComplaintReasonKey } from "@mezon-tutors/shared";

type ComplainLessonDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, message?: string) => void;
  isLoading?: boolean;
  lesson: LessonItem | null;
};

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

export function ComplainLessonDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  lesson,
}: ComplainLessonDialogProps) {
  const locale = useLocale();
  const t = useTranslations("MyLessons.panels.lessons.complaint");
  const tReasons = useTranslations("MyLessons.panels.lessons.complaint.reasons");

  const [reasonKey, setReasonKey] = useState<LessonComplaintReasonKey | "">("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReasonKey("");
      setMessage("");
    }
  }, [isOpen]);

  const reasonOptions = useMemo(
    () =>
      LESSON_COMPLAINT_REASON_KEYS.map((key) => ({
        value: key,
        label: tReasons(key),
      })),
    [tReasons],
  );

  const selectedReasonLabel = useMemo(() => {
    if (!reasonKey) return "";
    return tReasons(reasonKey);
  }, [reasonKey, tReasons]);

  const handleConfirm = () => {
    if (!selectedReasonLabel.trim()) return;
    onConfirm(selectedReasonLabel, message.trim() || undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden rounded-3xl border-violet-100/80 p-0 shadow-2xl shadow-violet-200/30 sm:max-w-[460px]"
      >
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_50%,#db2777_100%)] px-6 pb-5 pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm">
              <Flag className="size-5 text-white" />
            </div>
            <DialogHeader className="space-y-1.5 p-0 text-left">
              <DialogTitle className="text-lg font-bold tracking-tight text-white">
                {t("dialog.title")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-violet-50/95">
                {lesson
                  ? t("dialog.subtitle", {
                      tutor: lesson.tutor,
                      date: lesson.dateLabel,
                      time: lesson.timeLabel,
                    })
                  : null}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {lesson ? (
          <>
            <div className="flex max-h-[min(70vh,520px)] flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="flex items-center gap-3.5 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3.5">
                <Avatar className="size-12 shrink-0 rounded-xl border border-violet-100">
                  {lesson.tutorAvatar ? (
                    <AvatarImage
                      src={lesson.tutorAvatar}
                      alt={lesson.tutor}
                      className="rounded-lg object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
                    {getInitials(lesson.tutor)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">
                    {lesson.tutor}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    <span className="font-semibold text-violet-600">
                      {formatLessonDateLabel(lesson.dateLabel, locale)}
                    </span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="font-bold text-slate-700">{lesson.timeLabel}</span>
                  </p>
                  {lesson.subject ? (
                    <p className="mt-1.5 truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {lesson.subject}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="complaint-reason"
                  className="block text-xs font-semibold tracking-wide text-slate-900"
                >
                  {t("dialog.reasonLabel")}
                </label>
                <Select
                  value={reasonKey}
                  onValueChange={(v) => setReasonKey(v as LessonComplaintReasonKey)}
                >
                  <SelectTrigger
                    id="complaint-reason"
                    className="h-11 w-full rounded-xl border-violet-100 bg-slate-50/70 px-3.5 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-violet-200"
                  >
                    <SelectValue placeholder={t("dialog.reasonPlaceholder")}>
                      {reasonOptions.find((r) => r.value === reasonKey)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {reasonOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="py-2.5">
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="complaint-message"
                  className="block text-xs font-semibold tracking-wide text-slate-900"
                >
                  {t("dialog.messageLabel")}
                </label>
                <Textarea
                  id="complaint-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("dialog.messagePlaceholder")}
                  className="min-h-[100px] resize-none rounded-xl border-violet-100 bg-slate-50/70 p-3.5 text-sm leading-relaxed text-slate-700 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-violet-200"
                />
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-violet-200/80 bg-violet-50/70 px-3 py-2.5">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-violet-600"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-violet-900/90">
                  {t("dialog.windowHint", { hours: LESSON_COMPLAINT_WINDOW_HOURS })}
                </p>
              </div>
            </div>

            <DialogFooter className="m-0 gap-2 border-t border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-6 pt-4 pb-6 sm:justify-end">
              <Button
                variant="outline"
                className="h-10 rounded-full border-slate-200 px-5"
                onClick={onClose}
                disabled={isLoading}
              >
                {t("dialog.dismiss")}
              </Button>
              <Button
                className="h-10 rounded-full border-0 bg-[linear-gradient(110deg,#4c1d95,#7c3aed,#db2777)] px-6 font-semibold text-white shadow-md shadow-violet-300/40 hover:opacity-95 disabled:opacity-50"
                onClick={handleConfirm}
                disabled={!reasonKey || isLoading}
              >
                {isLoading ? t("dialog.submitting") : t("dialog.confirm")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
