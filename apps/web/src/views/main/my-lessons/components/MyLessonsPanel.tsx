"use client";

import {
  CalendarPlus,
  CalendarX,
  History,
  Sparkles,
  Star,
  Video,
  CalendarClock,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/store/auth.atom";
import { useMezonLight } from "@/providers";
import { Badge, Button, toast } from "@/components/ui";
import { formatLessonDateLabel } from "@/components/calendar/utils/format-locale";
import { ActionMenu } from "@/components/common/ActionMenu";
import type { LessonItem } from "@/services/my-lessons/my-lessons.api";
import { useCancelSubscriptionSlotMutation } from "@/services/subscription/subscription.api";
import {
  useCancelTrialLessonBookingMutation,
  useRescheduleTrialLessonBookingMutation,
} from "@/services/trial-lesson-booking/trial-lesson-booking.api";
import { useGetVerifiedTutorAbout } from "@/services/tutor-profile/tutor-profile.api";
import { walletQueryKey } from "@/services/wallet/wallet.qkey";
import { useUserTimezone } from "@/hooks";
import { isTrialLessonRescheduleEligible } from "@/lib/trial-lesson-cancellation";
import {
  TrialBookingSheet,
  type TrialBookingPayload,
} from "@/views/main/tutors/components/TrialBookingSheet";
import { ECurrency, formatToCurrency } from "@mezon-tutors/shared";
import {
  createMezonLightDM,
  persistMezonLightSession,
  refreshMezonLightSession,
  restoreMezonLightClientFromStorage,
  sendMezonLightDMWithRefreshFallback,
  useGetDmChannel,
  useCreateDmChannelMutation,
} from "@/services";
import { CancelLessonDialog } from "./CancelLessonDialog";
import { RescheduleSubscriptionLessonDialog } from "./RescheduleSubscriptionLessonDialog";

type LessonPersonBadgeProps = {
  name: string;
  avatar: string;
};

function isCancelledTrialLesson(lesson: LessonItem): boolean {
  return lesson.source === "trial" && lesson.trialBookingStatus === "cancelled";
}

function isReschedulableTrialLesson(lesson: LessonItem): boolean {
  return (
    lesson.source === "trial" &&
    lesson.trialBookingStatus === "confirmed" &&
    Boolean(lesson.startAt) &&
    isTrialLessonRescheduleEligible(lesson.startAt!)
  );
}

function isReschedulableSubscriptionLesson(lesson: LessonItem): boolean {
  return (
    isActivePaidSubscriptionLesson(lesson) &&
    Boolean(lesson.startAt) &&
    isTrialLessonRescheduleEligible(lesson.startAt!) &&
    !lesson.rescheduleRequestSubmitted
  );
}

function isActivePaidSubscriptionLesson(lesson: LessonItem): boolean {
  return (
    lesson.source === "subscription" &&
    lesson.status === "upcoming" &&
    lesson.enrollmentStatus?.toUpperCase() === "ACTIVE" &&
    lesson.enrollmentPaymentStatus?.toUpperCase() === "SUCCEEDED"
  );
}

function canShowRescheduleOrCancelMenu(lesson: LessonItem): boolean {
  if (isCancelledTrialLesson(lesson)) {
    return false;
  }
  if (lesson.source === "trial" && lesson.trialBookingStatus === "confirmed") {
    return true;
  }
  return isActivePaidSubscriptionLesson(lesson);
}

function LessonCancelledBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="secondary"
      className="h-9 rounded-full border-0 bg-slate-100 px-4 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
    >
      {label}
    </Badge>
  );
}

function LessonPersonBadge({ name, avatar }: LessonPersonBadgeProps) {
  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white shadow-sm shadow-violet-200/40">
      <Image
        src={avatar}
        alt={name}
        width={56}
        height={56}
        className="size-full object-cover"
      />
    </div>
  );
}

type PastLessonListItemProps = {
  lesson: LessonItem;
  rateLabel: string;
  ratedLabel: string;
  cancelledLabel: string;
  onRate: (tutorId: string) => void;
};

function PastLessonListItem({
  lesson,
  rateLabel,
  ratedLabel,
  cancelledLabel,
  onRate,
}: PastLessonListItemProps) {
  const locale = useLocale();
  const rated = lesson.rating !== undefined;
  const cancelled = isCancelledTrialLesson(lesson);

  return (
    <div className="group flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-white px-5 py-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40">
      <div className="flex min-w-[220px] flex-1 items-center gap-3">
        <LessonPersonBadge name={lesson.tutor} avatar={lesson.tutorAvatar} />
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-semibold text-slate-500">
            {formatLessonDateLabel(lesson.dateLabel, locale)}
          </p>
          <p className="text-lg font-extrabold leading-none text-slate-900">
            {lesson.timeLabel}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-semibold text-violet-700">{lesson.subject}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>{lesson.tutor}</span>
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {cancelled ? (
          <LessonCancelledBadge label={cancelledLabel} />
        ) : rated ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 ring-1 ring-amber-100">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-amber-700">
              {lesson.rating?.toFixed(1) ?? "5.0"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              {ratedLabel}
            </span>
          </div>
        ) : (
          <Button
            variant="outline"
            className="h-9 rounded-full border-amber-200 px-4 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-50"
            onClick={() => onRate(lesson.tutorId)}
          >
            <Star className="mr-1.5 size-3.5 fill-amber-400 text-amber-400" />
            {rateLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

type UpcomingLessonItemProps = {
  lesson: LessonItem;
  rescheduleOrCancelLabel: string;
  joinLessonLabel: string;
  cancelledLabel: string;
  onReschedule: (lesson: LessonItem) => void;
  onCancel: (lesson: LessonItem) => void;
};

function UpcomingLessonItem({
  lesson,
  rescheduleOrCancelLabel,
  joinLessonLabel,
  cancelledLabel,
  onReschedule,
  onCancel,
}: UpcomingLessonItemProps) {
  const locale = useLocale();
  const t = useTranslations("MyLessons.panels.lessons.cancellation.options");
  const cancelled = isCancelledTrialLesson(lesson);

  const canReschedule = isReschedulableTrialLesson(lesson) || isReschedulableSubscriptionLesson(lesson);

  const actionItems = [
    {
      label: t("reschedule"),
      icon: <CalendarClock className="size-4" />,
      onClick: () => onReschedule(lesson),
      disabled: !canReschedule,
    },
    {
      label: t("cancel"),
      icon: <Trash2 className="size-4 text-destructive" />,
      onClick: () => onCancel(lesson),
      variant: "destructive" as const,
    },
  ];
  return (
    <div className="group flex w-full flex-col gap-4 rounded-2xl border border-violet-100 bg-white px-5 py-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <LessonPersonBadge name={lesson.tutor} avatar={lesson.tutorAvatar} />
        <div className="min-w-0 flex flex-col gap-0.5">
          <p className="text-xs font-semibold text-violet-600">
            {formatLessonDateLabel(lesson.dateLabel, locale)}
          </p>
          <p className="text-lg font-extrabold leading-none text-slate-900">
            {lesson.timeLabel}
          </p>
          <p className="mt-1 truncate text-xs text-slate-600">
            <span className="font-semibold text-violet-700">{lesson.subject}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>{lesson.tutor}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        {cancelled ? (
          <LessonCancelledBadge label={cancelledLabel} />
        ) : canShowRescheduleOrCancelMenu(lesson) ? (
          <>
            <ActionMenu
              trigger={
                <Button
                  variant="outline"
                  className="h-9 rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  {rescheduleOrCancelLabel}
                </Button>
              }
              items={actionItems}
            />
            <Button className="group/btn h-9 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50">
              <Video className="mr-1.5 size-3.5" />
              {joinLessonLabel}
            </Button>
          </>
        ) : (
          <Button className="group/btn h-9 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50">
            <Video className="mr-1.5 size-3.5" />
            {joinLessonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

type EmptyUpcomingCardProps = {
  scheduleNowLabel: string;
  noUpcomingLabel: string;
  noUpcomingHintLabel: string;
  onSchedule: () => void;
};

function EmptyUpcomingCard({
  scheduleNowLabel,
  noUpcomingLabel,
  noUpcomingHintLabel,
  onSchedule,
}: EmptyUpcomingCardProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-8">
      <div className="pointer-events-none absolute -top-12 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-xl" />
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
            <CalendarX className="size-5" />
          </div>
        </div>

        <h3 className="max-w-md text-balance text-xl font-extrabold text-slate-900 sm:text-2xl">
          {noUpcomingLabel}
        </h3>
        <p className="max-w-md text-sm leading-6 text-slate-600">
          {noUpcomingHintLabel}
        </p>

        <Button
          onClick={onSchedule}
          className="group mt-2 h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
        >
          <Sparkles className="mr-1.5 size-3.5" />
          {scheduleNowLabel}
        </Button>
      </div>
    </div>
  );
}

type SectionHeaderProps = {
  icon: typeof CalendarPlus;
  accent: string;
  eyebrow: string;
  title: string;
  count?: number;
};

function SectionHeader({
  icon: Icon,
  accent,
  eyebrow,
  title,
  count,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md shadow-violet-300/40`}
      >
        <Icon className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
          {eyebrow}
        </p>
        <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
          {title}
          {typeof count === "number" ? (
            <span className="ml-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-violet-100 px-2 text-xs font-bold text-violet-700">
              {count}
            </span>
          ) : null}
        </h2>
      </div>
    </div>
  );
}

type LessonsSectionProps = {
  title: string;
  lessons: LessonItem[];
  emptyState?: React.ReactNode;
  rescheduleOrCancelLabel: string;
  joinLessonLabel: string;
  cancelledLabel: string;
  onReschedule: (lesson: LessonItem) => void;
  onCancel: (lesson: LessonItem) => void;
};

function LessonsSection({
  title,
  lessons,
  emptyState,
  rescheduleOrCancelLabel,
  joinLessonLabel,
  cancelledLabel,
  onReschedule,
  onCancel,
}: LessonsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={CalendarPlus}
        accent="from-violet-500 to-purple-500"
        eyebrow="Upcoming"
        title={title}
        count={lessons.length}
      />

      <div className="flex flex-col gap-2.5">
        {lessons.length
          ? lessons.map((lesson) => (
              <UpcomingLessonItem
                key={lesson.id}
                lesson={lesson}
                rescheduleOrCancelLabel={rescheduleOrCancelLabel}
                joinLessonLabel={joinLessonLabel}
                cancelledLabel={cancelledLabel}
                onReschedule={onReschedule}
                onCancel={onCancel}
              />
            ))
          : emptyState}
      </div>
    </div>
  );
}

type PastLessonsSectionProps = {
  title: string;
  lessons: LessonItem[];
  rateLabel: string;
  ratedLabel: string;
  cancelledLabel: string;
  onRate: (tutorId: string) => void;
};

function PastLessonsSection({
  title,
  lessons,
  rateLabel,
  ratedLabel,
  cancelledLabel,
  onRate,
}: PastLessonsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={History}
        accent="from-fuchsia-500 to-rose-500"
        eyebrow="Past lessons"
        title={title}
        count={lessons.length}
      />

      <div className="flex flex-col gap-2.5">
        {lessons.map((lesson) => (
          <PastLessonListItem
            key={lesson.id}
            lesson={lesson}
            rateLabel={rateLabel}
            ratedLabel={ratedLabel}
            cancelledLabel={cancelledLabel}
            onRate={onRate}
          />
        ))}
      </div>
    </div>
  );
}

type MyLessonsPanelProps = {
  upcomingLessons: LessonItem[];
  previousLessons: LessonItem[];
};

export default function MyLessonsPanel({
  upcomingLessons,
  previousLessons,
}: MyLessonsPanelProps) {
  const t = useTranslations("MyLessons");
  const router = useRouter();

  const currentUser = useAtomValue(userAtom);
  const senderId = currentUser?.id ?? "";
  const senderMezonUserId = currentUser?.mezonUserId ?? "";

  const handleRate = (tutorId: string) => {
    router.push(`/tutors/${tutorId}`);
  };

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const recipientId = selectedLesson?.tutorUserId ?? "";
  const recipientMezonUserId = selectedLesson?.tutorMezonUserId ?? "";

  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, recipientId, false);
  const createDmChannelMutation = useCreateDmChannelMutation();
  const { lightClient, setLightClient } = useMezonLight();
  const queryClient = useQueryClient();
  const cancelMutation = useCancelTrialLessonBookingMutation();
  const cancelSubscriptionMutation = useCancelSubscriptionSlotMutation();
  const rescheduleMutation = useRescheduleTrialLessonBookingMutation();
  const userTimezone = useUserTimezone();

  const [rescheduleLesson, setRescheduleLesson] = useState<LessonItem | null>(null);
  const [rescheduleSubscriptionLesson, setRescheduleSubscriptionLesson] =
    useState<LessonItem | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const { data: rescheduleTutorAbout } = useGetVerifiedTutorAbout(
    rescheduleLesson?.tutorId ?? "",
  );

  const handleReschedule = (lesson: LessonItem) => {
    if (lesson.source === "subscription") {
      if (lesson.rescheduleRequestSubmitted) {
        toast.error(t("panels.lessons.reschedule.alreadyRequested"));
        return;
      }
      if (!isReschedulableSubscriptionLesson(lesson)) {
        toast.error(t("panels.lessons.reschedule.within12Hours"));
        return;
      }
      setRescheduleSubscriptionLesson(lesson);
      return;
    }
    if (!isReschedulableTrialLesson(lesson)) {
      toast.error(t("panels.lessons.reschedule.within12Hours"));
      return;
    }
    setRescheduleLesson(lesson);
  };

  const handleConfirmReschedule = async (payload: TrialBookingPayload) => {
    if (!rescheduleLesson) return;

    try {
      setIsRescheduling(true);
      await rescheduleMutation.mutateAsync({
        bookingId: rescheduleLesson.id,
        payload: {
          startAt: payload.startAt,
          durationMinutes: payload.duration,
        },
        timezone: userTimezone,
      });
      await queryClient.invalidateQueries({ queryKey: ["my-lessons"] });
      toast.success(t("panels.lessons.reschedule.success"));
      setRescheduleLesson(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : t("panels.lessons.reschedule.failed"),
      );
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelClick = (lesson: LessonItem) => {
    setSelectedLesson(lesson);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (reason: string, message?: string) => {
    if (!selectedLesson) return;

    if (message?.trim()) {
      if (!senderId || !senderMezonUserId || !recipientMezonUserId || !recipientId) {
        toast.error("Missing user information to send message.");
      } else {
        setIsCanceling(true);
        try {
          let client = lightClient;
          if (!client) {
            client = await restoreMezonLightClientFromStorage();
            if (!client) {
              throw new Error("Cannot restore Mezon client. Please login again.");
            }
            setLightClient(client);
          }

          const isSessionExpired = await client.isSessionExpired();
          if (isSessionExpired) {
            await refreshMezonLightSession(client);
            await persistMezonLightSession(client);
          }

          let channelId = (await refetchDmChannel()).data?.channelId;
          if (!channelId) {
            const dmChannel = await createMezonLightDM(client, recipientMezonUserId);
            channelId = dmChannel?.channel_id;
            if (!channelId) {
              throw new Error("Could not create DM channel.");
            }

            await createDmChannelMutation.mutateAsync({
              senderId,
              recipientId,
              channelId,
            });
          }

          await sendMezonLightDMWithRefreshFallback(client, channelId, message.trim());
          toast.success(t("panels.lessons.cancellation.dialog.messageSent"));
        } catch (error) {
          console.error("DM Error:", error);
          // Allow lesson cancellation to proceed even if DM fails
          toast.error("Failed to send message, but proceeding with cancellation...");
        }
      }
    }

    try {
      setIsCanceling(true);

      if (selectedLesson.source === "subscription") {
        const enrollmentId = selectedLesson.subscriptionEnrollmentId;
        const slotIndex = selectedLesson.subscriptionSlotIndex;
        if (enrollmentId == null || slotIndex == null) {
          throw new Error("Missing subscription lesson reference");
        }
        const result = await cancelSubscriptionMutation.mutateAsync({
          enrollmentId,
          slotIndex,
          payload: { reason, message: message?.trim() },
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["my-lessons"] }),
          result.credited
            ? queryClient.invalidateQueries({ queryKey: walletQueryKey.all })
            : Promise.resolve(),
        ]);
        const amountLabel =
          result.refundAmount > 0 && result.currency
            ? formatToCurrency(
                result.currency as ECurrency,
                result.refundAmount,
              )
            : null;
        toast.success(
          result.credited && amountLabel
            ? t("panels.lessons.subscription.cancellation.dialog.successCredited", {
                amount: amountLabel,
              })
            : t("panels.lessons.subscription.cancellation.dialog.successNoCredit"),
        );
      } else {
        const result = await cancelMutation.mutateAsync({
          bookingId: selectedLesson.id,
          payload: { reason, message: message?.trim() },
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["my-lessons"] }),
          result.refunded
            ? queryClient.invalidateQueries({ queryKey: walletQueryKey.all })
            : Promise.resolve(),
        ]);
        toast.success(
          result.refunded
            ? t("panels.lessons.cancellation.dialog.successRefunded")
            : t("panels.lessons.cancellation.dialog.successNoRefund"),
        );
      }

      setIsCancelDialogOpen(false);
      setSelectedLesson(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel lesson.");
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="ml-0 flex w-full max-w-[1032px] flex-col gap-7">
      <LessonsSection
        title={t("panels.lessons.upcoming.title")}
        lessons={upcomingLessons}
        rescheduleOrCancelLabel={t(
          "panels.lessons.upcoming.rescheduleOrCancel",
        )}
        joinLessonLabel={t("panels.lessons.upcoming.joinLesson")}
        cancelledLabel={t("panels.lessons.upcoming.statusCancelled")}
        onReschedule={handleReschedule}
        onCancel={handleCancelClick}
        emptyState={
          <EmptyUpcomingCard
            scheduleNowLabel={t("panels.lessons.upcoming.scheduleNow")}
            noUpcomingLabel={t("panels.lessons.upcoming.emptyTitle")}
            noUpcomingHintLabel={t("panels.lessons.upcoming.emptyDescription")}
            onSchedule={() => router.push("/tutors")}
          />
        }
      />

      {previousLessons.length > 0 && (
        <PastLessonsSection
          title={t("panels.lessons.past.title")}
          lessons={previousLessons}
          rateLabel={t("panels.lessons.past.rate")}
          ratedLabel={t("panels.lessons.past.rated")}
          cancelledLabel={t("panels.lessons.past.statusCancelled")}
          onRate={handleRate}
        />
      )}

      <CancelLessonDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancel}
        lesson={selectedLesson}
        isLoading={isCanceling}
      />

      {rescheduleLesson && rescheduleTutorAbout ? (
        <TrialBookingSheet
          open
          mode="reschedule"
          rescheduleBookingId={rescheduleLesson.id}
          rescheduleOriginalStartAt={rescheduleLesson.startAt}
          initialDurationMinutes={rescheduleLesson.durationMinutes ?? 30}
          lockDuration
          onOpenChange={(open) => {
            if (!open && !isRescheduling) {
              setRescheduleLesson(null);
            }
          }}
          onConfirm={handleConfirmReschedule}
          tutor={{
            id: rescheduleTutorAbout.id,
            name: rescheduleLesson.tutor,
            title: rescheduleLesson.subject,
            prices: {
              baseCurrency: rescheduleTutorAbout.prices.baseCurrency ?? ECurrency.VND,
              usd: rescheduleTutorAbout.prices.usd,
              vnd: rescheduleTutorAbout.prices.vnd,
              php: rescheduleTutorAbout.prices.php,
            },
            avatar: rescheduleLesson.tutorAvatar || rescheduleTutorAbout.avatar,
          }}
        />
      ) : null}

      <RescheduleSubscriptionLessonDialog
        lesson={rescheduleSubscriptionLesson}
        open={Boolean(rescheduleSubscriptionLesson)}
        onClose={() => setRescheduleSubscriptionLesson(null)}
      />
    </div>
  );
}
