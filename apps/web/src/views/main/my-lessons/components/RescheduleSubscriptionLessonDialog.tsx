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
import { computeBlockedWallClockSlots } from "@/lib/schedule-slot-occupancy";
import {
  convertWallClockSlotBetweenTimezones,
  getWeekStartMondayInTimezone,
  parseYmdInTimezone,
} from "@/lib/timezone";
import { PUBLIC_APP_SETTINGS_FALLBACK } from "@mezon-tutors/shared";
import {
  useGetSubscriptionSlotRescheduleOptions,
  useRescheduleSubscriptionSlotMutation,
} from "@/services/subscription/subscription.api";
import { usePublicAppSettings } from "@/services";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { userAtom } from "@/store/auth.atom";
import { useMezonLight } from "@/providers";
import {
  buildStudentLessonRescheduledDmContent,
  formatLessonRangeFromWallClock,
  formatLessonRangeInTimezone,
} from "@mezon-tutors/shared";
import { sendStudentLessonDmToTutor } from "@/lib/send-student-lesson-dm-to-tutor";
import {
  useCreateDmChannelMutation,
  useGetDmChannel,
} from "@/services";

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
  const tDm = useTranslations("MyLessons.panels.lessons.cancellation");
  const locale = useLocale();
  const userTimezone = useUserTimezone();
  const { data: publicAppSettings } = usePublicAppSettings();
  const lessonChangePeriodHours =
    publicAppSettings?.lessonChangePeriodHours ??
    PUBLIC_APP_SETTINGS_FALLBACK.lessonChangePeriodHours;
  const currentUser = useAtomValue(userAtom);
  const senderId = currentUser?.id ?? "";
  const senderMezonUserId = currentUser?.mezonUserId ?? "";
  const recipientId = lesson?.tutorUserId ?? "";
  const recipientMezonUserId = lesson?.tutorMezonUserId ?? "";
  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, recipientId, false);
  const createDmChannelMutation = useCreateDmChannelMutation();
  const { lightClient, setLightClient } = useMezonLight();
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

  const tutorTimezone = options?.tutorTimezone ?? "UTC";
  const gridInterval = options?.gridIntervalMinutes ?? 60;
  const lessonDuration = options?.lessonDurationMinutes ?? 60;

  const scheduleAvailableSlots = useMemo(
    () => options?.slots ?? [],
    [options?.slots],
  );

  const scheduleBlockedSlots = useMemo(() => {
    const fromApi = options?.blockedSlots ?? [];
    if (!scheduleAvailableSlots.length) {
      return fromApi;
    }
    const leadTimeBlocked = computeBlockedWallClockSlots(
      scheduleAvailableSlots,
      lessonDuration,
      userTimezone,
      { minHoursFromNow: lessonChangePeriodHours },
    );
    const keys = new Set<string>();
    const merged = [...fromApi, ...leadTimeBlocked];
    return merged.filter((slot) => {
      const key = `${slot.date}|${slot.startTime}`;
      if (keys.has(key)) {
        return false;
      }
      keys.add(key);
      return true;
    });
  }, [
    options?.blockedSlots,
    scheduleAvailableSlots,
    lessonDuration,
    userTimezone,
    lessonChangePeriodHours,
  ]);

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

    const originalStartAt = lesson.startAt;
    const durationMinutes = lesson.durationMinutes ?? lessonDuration;

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

      if (originalStartAt && recipientMezonUserId) {
        try {
          const dmContent = buildStudentLessonRescheduledDmContent({
            lessonKind: "subscription",
            originalLabel: formatLessonRangeInTimezone(
              originalStartAt,
              durationMinutes,
              userTimezone,
              locale,
            ),
            newLabel: formatLessonRangeFromWallClock(
              picked.date,
              picked.startTime,
              picked.endTime,
              userTimezone,
              locale,
            ),
            locale,
            senderAvatarUrl: currentUser?.avatar,
          });
          await sendStudentLessonDmToTutor({
            lightClient,
            setLightClient,
            senderId,
            senderMezonUserId,
            recipientId,
            recipientMezonUserId,
            refetchDmChannel: async () => {
              const r = await refetchDmChannel();
              return { data: r.data ?? null };
            },
            createDmChannelMutation,
            content: dmContent,
          });
        } catch (dmError) {
          console.error("DM Error:", dmError);
          toast.error(tDm("dialog.messageFailed"));
        }
      }

      toast.success(t("dialog.success"));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dialog.failed"));
    }
  };

  const loading = isLoading || isFetching;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[min(96vh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-violet-100 p-2 [&>button]:top-5 sm:max-w-[min(66.666vw,1400px)] sm:w-[min(66.666vw,1400px)]">
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

        <div className="min-h-0 flex-1 overflow-hidden px-2 py-2">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Spinner className="size-8 text-violet-600" />
            </div>
          ) : (
            <ScheduleSelection
              availableSlots={scheduleAvailableSlots}
              blockedSlots={scheduleBlockedSlots}
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
          <Button variant="outline" className="h-11 px-6 rounded-full border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 sm:order-1" onClick={onClose}>
            {t("dialog.dismiss")}
          </Button>
          <Button
            className="h-11 px-6 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-bold text-white shadow-md shadow-violet-300/40 transition-all hover:opacity-90 sm:order-2"
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
