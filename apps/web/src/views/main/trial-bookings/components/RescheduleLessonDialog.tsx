"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Info } from "lucide-react";
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
import { getAvatarGradient } from "@/lib/avatar-utils";
import { formatLessonDateLabel } from "@/components/calendar/utils/format-locale";

export type TutorRescheduleLessonTarget = {
  id: string;
  studentName: string;
  studentAvatarUrl?: string;
  dateLabel: string;
  timeLabel: string;
  subject?: string;
  groupName?: string;
};

type RescheduleLessonDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, message?: string) => void;
  isLoading?: boolean;
  lesson: TutorRescheduleLessonTarget | null;
  /** Trial vs subscription — dialog title only; tutor action is always a request. */
  lessonKind?: "trial" | "subscription";
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

export function RescheduleLessonDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  lesson,
  lessonKind = "trial",
}: RescheduleLessonDialogProps) {
  const t = useTranslations("Dashboard.bookingRequests.reschedule");
  const dialogTitle =
    lessonKind === "subscription"
      ? t("dialog.titleSubscription")
      : t("dialog.title");
  const locale = useLocale();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setMessage("");
    }
  }, [isOpen]);

  const reasons = useMemo(
    () => [
      { value: "scheduleConflict", label: t("reasons.scheduleConflict") },
      { value: "personalEmergency", label: t("reasons.personalEmergency") },
      { value: "studentUnavailable", label: t("reasons.studentUnavailable") },
      { value: "networkPowerOutage", label: t("reasons.networkPowerOutage") },
      { value: "equipmentFailure", label: t("reasons.equipmentFailure") },
      { value: "tutorSickLostVoice", label: t("reasons.tutorSickLostVoice") },
      { value: "unexpectedFamilyMatter", label: t("reasons.unexpectedFamilyMatter") },
      { value: "other", label: t("reasons.other") },
    ],
    [t],
  );

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

        {lesson && (
          <>
            <div className="flex max-h-[min(70vh,520px)] flex-col gap-3 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3 rounded-2xl border border-violet-100/80 bg-violet-50/30 px-3 py-3">
                <Avatar className="size-12 shrink-0 rounded-xl border border-violet-100">
                  {lesson.studentAvatarUrl ? (
                    <AvatarImage
                      src={lesson.studentAvatarUrl}
                      alt={lesson.studentName}
                      className="rounded-lg object-cover"
                    />
                  ) : null}
                  <AvatarFallback className={`rounded-lg bg-gradient-to-br ${getAvatarGradient(lessonKind, lesson.groupName)} text-xs font-bold text-white`}>
                    {getInitials(lesson.studentName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">
                    {lesson.studentName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">
                    <span className="font-semibold text-violet-600">
                      {formatLessonDateLabel(lesson.dateLabel, locale)}
                    </span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="font-bold text-slate-700">{lesson.timeLabel}</span>
                  </p>
                  {lesson.subject ? (
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                      {lesson.subject}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Info className="size-4" />
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  {t("dialog.policyHint")}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="mb-2 text-xs font-semibold text-slate-900">
                  {t("dialog.reasonLabel")}
                </Label>
                <Select value={reason} onValueChange={(val) => setReason(val ?? "")}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-violet-100 bg-white px-3.5 text-sm text-slate-700 focus:ring-2 focus:ring-violet-200">
                    <SelectValue placeholder={t("dialog.reasonPlaceholder")}>
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
                  {t("dialog.messageLabel", { student: lesson.studentName })}
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("dialog.messagePlaceholder")}
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
                {t("dialog.dismiss")}
              </Button>
              <Button
                className="h-11 flex-1 rounded-full bg-brand-gradient text-sm font-bold text-white shadow-md shadow-violet-300/40 transition-all hover:opacity-90 sm:order-2"
                disabled={!reason || isLoading}
                onClick={handleConfirm}
              >
                {t("dialog.confirm")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
