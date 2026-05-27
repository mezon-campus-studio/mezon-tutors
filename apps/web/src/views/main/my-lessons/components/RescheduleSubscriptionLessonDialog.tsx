"use client";

import type { LessonItem } from "@/services/my-lessons/my-lessons.api";
import {
  ScheduleSelection,
  type SelectedScheduleSlot,
} from "@/components/common/ScheduleSelection";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  toast,
} from "@/components/ui";
import { useUserTimezone } from "@/hooks";
import {
  convertWallClockSlotBetweenTimezones,
  getWeekStartMondayInTimezone,
} from "@/lib/timezone";
import {
  useGetSubscriptionSlotRescheduleOptions,
  useRescheduleSubscriptionSlotMutation,
} from "@/services/subscription/subscription.api";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type RescheduleSubscriptionLessonDialogProps = {
  lesson: LessonItem | null;
  open: boolean;
  onClose: () => void;
};

function getInitialWeekBounds(timezoneName: string) {
  const monday = getWeekStartMondayInTimezone(timezoneName);
  return {
    start: monday.format("YYYY-MM-DD"),
    end: monday.add(6, "day").format("YYYY-MM-DD"),
  };
}

export function RescheduleSubscriptionLessonDialog({
  lesson,
  open,
  onClose,
}: RescheduleSubscriptionLessonDialogProps) {
  const t = useTranslations("MyLessons.panels.lessons.subscription.reschedule");
  const userTimezone = useUserTimezone();
  const [weekBounds, setWeekBounds] = useState(() =>
    getInitialWeekBounds(userTimezone),
  );
  const [selectedSlots, setSelectedSlots] = useState<SelectedScheduleSlot[]>([]);

  const enrollmentId = lesson?.subscriptionEnrollmentId ?? "";
  const slotIndex = lesson?.subscriptionSlotIndex ?? -1;

  const { data: options, isLoading, isFetching, error } =
    useGetSubscriptionSlotRescheduleOptions(
      enrollmentId,
      slotIndex,
      weekBounds.start,
      userTimezone,
      open && Boolean(enrollmentId) && slotIndex >= 0,
    );

  const rescheduleMutation = useRescheduleSubscriptionSlotMutation();

  useEffect(() => {
    if (open) {
      setWeekBounds(getInitialWeekBounds(userTimezone));
      setSelectedSlots([]);
    }
  }, [open, userTimezone]);

  useEffect(() => {
    if (error && open) {
      toast.error(
        error instanceof Error ? error.message : t("dialog.loadFailed"),
      );
    }
  }, [error, open, t]);

  const scheduleAvailableSlots = useMemo(
    () => options?.slots ?? [],
    [options?.slots],
  );

  const tutorTimezone = options?.tutorTimezone ?? "UTC";
  const gridInterval = options?.gridIntervalMinutes ?? 60;
  const lessonDuration = options?.lessonDurationMinutes ?? 60;

  const handleWeekChange = useCallback(
    (payload: { startDate: string; endDate: string }) => {
      setWeekBounds({ start: payload.startDate, end: payload.endDate });
      setSelectedSlots([]);
    },
    [],
  );

  const handleConfirm = async () => {
    const picked = selectedSlots[0];
    if (!lesson || !picked || enrollmentId === "" || slotIndex < 0) {
      return;
    }

    const converted = convertWallClockSlotBetweenTimezones(
      picked.date,
      picked.startTime,
      picked.endTime,
      userTimezone,
      tutorTimezone,
    );

    try {
      await rescheduleMutation.mutateAsync({
        enrollmentId,
        slotIndex,
        payload: converted,
        timezone: userTimezone,
      });
      toast.success(t("dialog.success"));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dialog.failed"));
    }
  };

  const loading = isLoading || isFetching;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,880px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-violet-100 p-0 sm:max-w-[min(66.666vw,1400px)] sm:w-[min(66.666vw,1400px)]">
        <DialogHeader className="border-b border-violet-50 px-5 py-4">
          <DialogTitle className="font-heading text-lg font-extrabold text-slate-900">
            {t("dialog.title")}
          </DialogTitle>
          {lesson ? (
            <p className="text-sm text-slate-600">
              {t("dialog.subtitle", {
                tutor: lesson.tutor,
                date: lesson.dateLabel,
                time: lesson.timeLabel,
              })}
            </p>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner className="size-8 text-violet-600" />
            </div>
          ) : (
            <ScheduleSelection
              availableSlots={scheduleAvailableSlots}
              timezone={userTimezone}
              selectionMode="single"
              maxSelections={1}
              value={selectedSlots}
              onChange={setSelectedSlots}
              onWeekChange={handleWeekChange}
              fillAvailableHeight
              className="min-h-[min(60vh,560px)] w-full"
              gridIntervalMinutes={gridInterval}
              lessonDurationMinutes={lessonDuration}
            />
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-violet-50 px-5 py-4 sm:flex-row">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            {t("dialog.dismiss")}
          </Button>
          <Button
            className="rounded-full"
            disabled={selectedSlots.length !== 1 || rescheduleMutation.isPending}
            onClick={handleConfirm}
          >
            {rescheduleMutation.isPending ? t("dialog.confirming") : t("dialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
