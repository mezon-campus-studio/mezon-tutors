"use client";

import {
  CalendarPlus,
  CalendarX,
  History,
  Info,
  Sparkles,
  Star,
  CalendarClock,
  ExternalLink,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/store/auth.atom";
import { useMezonLight } from "@/providers";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, toast } from "@/components/ui";
import { formatLessonDateLabel } from "@/components/calendar/utils/format-locale";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/common/ActionMenu";
import { SendMessageModal } from "@/components/common/SendMessageModal";
import type { LessonItem } from "@/services/my-lessons/my-lessons.api";
import { useCancelSubscriptionSlotMutation } from "@/services/subscription/subscription.api";
import {
  useCancelTrialLessonBookingMutation,
  useRescheduleTrialLessonBookingMutation,
} from "@/services/trial-lesson-booking/trial-lesson-booking.api";
import { useGetVerifiedTutorAbout } from "@/services/tutor-profile/tutor-profile.api";
import { walletQueryKey } from "@/services/wallet/wallet.qkey";
import { useOpenAdminSupportChat, useUserTimezone } from "@/hooks";
import {
  TrialBookingSheet,
  type TrialBookingPayload,
} from "@/views/main/tutors/components/TrialBookingSheet";
import {
  buildStudentLessonCancelledDmContent,
  buildStudentLessonRescheduledDmContent,
  ECurrency,
  formatLessonRangeInTimezone,
  getLessonEndAt,
  isLessonFinishedForComplaint,
  isTrialLessonRescheduleEligible,
  isWithinLessonComplaintWindow,
  MEZON_DIRECT_MESSAGE_URL,
  PUBLIC_APP_SETTINGS_FALLBACK,
} from "@mezon-tutors/shared";
import { ensureMezonDmChannel } from "@/lib/ensure-mezon-dm-channel";
import { sendStudentLessonDmToTutor } from "@/lib/send-student-lesson-dm-to-tutor";
import {
  useGetDmChannel,
  useCreateDmChannelMutation,
  usePublicAppSettings,
  useGetSupportBotContact,
} from "@/services";
import { CancelLessonDialog } from "./CancelLessonDialog";
import { ComplainLessonDialog } from "./ComplainLessonDialog";
import { RescheduleSubscriptionLessonDialog } from "./RescheduleSubscriptionLessonDialog";
import { useCreateLessonComplaintMutation } from "@/services/lesson-complaint/lesson-complaint.api";

type LessonPersonBadgeProps = {
  name: string;
  avatar: string;
};

function isCancelledLesson(lesson: LessonItem): boolean {
  if (lesson.source === "trial") {
    return lesson.trialBookingStatus === "cancelled";
  }
  if (lesson.source === "subscription") {
    const status = lesson.subscriptionSlotStatus?.toUpperCase();
    return status === "CANCELLED" || status === "REFUNDED";
  }
  return false;
}

function isCancelledTrialLesson(lesson: LessonItem): boolean {
  return isCancelledLesson(lesson);
}

type AppSettingsRules = {
  disputePeriodHours: number;
  lessonChangePeriodHours: number;
};

function hasLessonComplaintStatus(lesson: LessonItem): boolean {
  return Boolean(lesson.complaintStatus?.trim());
}

function getLessonDurationMinutes(lesson: LessonItem): number {
  if (lesson.durationMinutes && lesson.durationMinutes > 0) {
    return lesson.durationMinutes;
  }
  if (lesson.startHour != null && lesson.endHour != null && lesson.endHour > lesson.startHour) {
    return Math.round((lesson.endHour - lesson.startHour) * 60);
  }
  return 60;
}

function isLessonInProgress(lesson: LessonItem, now: Date = new Date()): boolean {
  if (!lesson.startAt || isCancelledLesson(lesson)) {
    return false;
  }

  const durationMinutes = getLessonDurationMinutes(lesson);
  const start = dayjs(lesson.startAt).utc();
  const end = dayjs(getLessonEndAt(lesson.startAt, durationMinutes)).utc();
  const nowUtc = dayjs(now).utc();

  return !nowUtc.isBefore(start) && nowUtc.isBefore(end);
}

function isLessonPaymentEligibleForComplaint(lesson: LessonItem): boolean {
  const trialPaid =
    lesson.source !== "trial" ||
    ["SUCCEEDED", "REFUNDED"].includes(
      (lesson.trialPaymentStatus?.toUpperCase() ?? "SUCCEEDED"),
    );
  const subscriptionPaid =
    lesson.source !== "subscription" ||
    lesson.enrollmentPaymentStatus?.toUpperCase() === "SUCCEEDED";

  return trialPaid && subscriptionPaid;
}

function canShowLessonComplaint(lesson: LessonItem, rules: AppSettingsRules): boolean {
  if (hasLessonComplaintStatus(lesson) || isCancelledTrialLesson(lesson)) {
    return false;
  }

  if (lesson.canComplain) {
    return true;
  }

  if (!lesson.startAt || !isLessonPaymentEligibleForComplaint(lesson)) {
    return false;
  }

  const durationMinutes = getLessonDurationMinutes(lesson);
  const now = new Date();

  if (!isLessonFinishedForComplaint(lesson.startAt, durationMinutes, now)) {
    return false;
  }

  return isWithinLessonComplaintWindow(
    lesson.startAt,
    durationMinutes,
    now,
    rules.disputePeriodHours,
  );
}

function isReschedulableTrialLesson(lesson: LessonItem, rules: AppSettingsRules): boolean {
  return (
    lesson.source === "trial" &&
    lesson.trialBookingStatus === "confirmed" &&
    Boolean(lesson.startAt) &&
    isTrialLessonRescheduleEligible(lesson.startAt!, new Date(), rules.lessonChangePeriodHours)
  );
}

function isReschedulableSubscriptionLesson(
  lesson: LessonItem,
  rules: AppSettingsRules,
): boolean {
  return (
    isActivePaidSubscriptionLesson(lesson) &&
    Boolean(lesson.startAt) &&
    isTrialLessonRescheduleEligible(lesson.startAt!, new Date(), rules.lessonChangePeriodHours)
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
  // Group members who are not the payer (leader) cannot reschedule or cancel
  if (lesson.groupName && lesson.isPayer === false) {
    return false;
  }
  if (lesson.source === "trial" && lesson.trialBookingStatus === "confirmed") {
    return true;
  }
  return isActivePaidSubscriptionLesson(lesson);
}

type LessonStatusBadgeTone = "neutral" | "pending" | "approved" | "rejected";

const LESSON_STATUS_BADGE_STYLES: Record<LessonStatusBadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

function LessonStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: LessonStatusBadgeTone;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-9 rounded-full border-0 px-4 text-xs font-bold ring-1",
        LESSON_STATUS_BADGE_STYLES[tone],
      )}
    >
      {label}
    </Badge>
  );
}

function LessonPersonBadge({ name, avatar }: LessonPersonBadgeProps) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "T";

  return (
    <Avatar className="size-14 shrink-0 rounded-2xl ring-2 ring-white shadow-sm shadow-violet-200/40">
      {avatar ? <AvatarImage src={avatar} alt={name} className="object-cover" /> : null}
      <AvatarFallback className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

type PastLessonListItemProps = {
  lesson: LessonItem;
  rateLabel: string;
  ratedLabel: string;
  cancelledLabel: string;
  complainLabel: string;
  complaintPendingLabel: string;
  complaintTutorReviewRequestedLabel: string;
  complaintTutorConfirmedLabel: string;
  complaintTutorRejectedLabel: string;
  complaintApprovedLabel: string;
  complaintRejectedLabel: string;
  appSettingsRules: AppSettingsRules;
  onRate: (tutorId: string) => void;
  onComplain: (lesson: LessonItem) => void;
  contactSupportLabel: string;
  isOpeningSupportChat: boolean;
  onContactSupport: () => void;
};

function PastLessonListItem({
  lesson,
  rateLabel,
  ratedLabel,
  cancelledLabel,
  complainLabel,
  complaintPendingLabel,
  complaintTutorReviewRequestedLabel,
  complaintTutorConfirmedLabel,
  complaintTutorRejectedLabel,
  complaintApprovedLabel,
  complaintRejectedLabel,
  appSettingsRules,
  onRate,
  onComplain,
  contactSupportLabel,
  isOpeningSupportChat,
  onContactSupport,
}: PastLessonListItemProps) {
  const locale = useLocale();
  const rated = lesson.rating !== undefined;
  const cancelled = isCancelledTrialLesson(lesson);
  const complaintStatus = lesson.complaintStatus?.toUpperCase();
  const showComplaintStatus = hasLessonComplaintStatus(lesson);
  const tGroups = useTranslations('Groups');

  return (
    <div className="group flex w-full flex-col gap-4 rounded-2xl border border-violet-100 bg-white px-4 py-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <LessonPersonBadge name={lesson.tutor} avatar={lesson.tutorAvatar} />
        <div className="min-w-0 flex flex-col gap-0.5">
          {lesson.groupName && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-600">
               {tGroups('groupStudyPrefix')}: {lesson.groupName}
            </p>
          )}
          <p className="text-xs font-semibold text-slate-500">
            {formatLessonDateLabel(lesson.dateLabel, locale)}
          </p>
          <p className="text-lg font-extrabold leading-none text-slate-900">
            {lesson.timeLabel}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-semibold text-violet-700">{lesson.subject}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="break-words">{lesson.tutor}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
        {cancelled ? (
          <LessonStatusBadge label={cancelledLabel} tone="neutral" />
        ) : (
          <>
            {showComplaintStatus ? (
              <>
                {complaintStatus === "PENDING" ? (
                  <LessonStatusBadge label={complaintPendingLabel} tone="pending" />
                ) : complaintStatus === "TUTOR_REVIEW_REQUESTED" ? (
                  <LessonStatusBadge label={complaintTutorReviewRequestedLabel} tone="pending" />
                ) : complaintStatus === "TUTOR_CONFIRMED" ? (
                  <LessonStatusBadge label={complaintTutorConfirmedLabel} tone="pending" />
                ) : complaintStatus === "TUTOR_REJECTED" ? (
                  <LessonStatusBadge label={complaintTutorRejectedLabel} tone="rejected" />
                ) : complaintStatus === "APPROVED" ? (
                  <LessonStatusBadge label={complaintApprovedLabel} tone="approved" />
                ) : complaintStatus === "REJECTED" || complaintStatus === "TUTOR_REJECTED" ? (
                  <>
                    <LessonStatusBadge
                      label={
                        complaintStatus === "TUTOR_REJECTED"
                          ? complaintTutorRejectedLabel
                          : complaintRejectedLabel
                      }
                      tone="rejected"
                    />
                    <Button
                      variant="outline"
                      className="h-9 rounded-full border-violet-200 px-4 text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50"
                      onClick={onContactSupport}
                      disabled={isOpeningSupportChat}
                    >
                      <MessageCircle className="mr-1.5 size-3.5" />
                      {contactSupportLabel}
                    </Button>
                  </>
                ) : (
                  <LessonStatusBadge
                    label={lesson.complaintStatus ?? complaintPendingLabel}
                    tone="pending"
                  />
                )}
              </>
            ) : canShowLessonComplaint(lesson, appSettingsRules) ? (
              <Button
                variant="outline"
                className="h-9 rounded-full border-violet-200 px-4 text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50"
                onClick={() => {
                  if (lesson.groupName && lesson.isPayer === false) {
                    toast.warning(tGroups('memberComplaintWarning'));
                    return;
                  }
                  onComplain(lesson);
                }}
              >
                {complainLabel}
              </Button>
            ) : null}
            {rated ? (
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
          </>
        )}
      </div>
    </div>
  );
}

type UpcomingLessonItemProps = {
  lesson: LessonItem;
  rescheduleOrCancelLabel: string;
  joinNowLabel: string;
  joinNowFailedLabel: string;
  messageLabel: string;
  cancelledLabel: string;
  appSettingsRules: AppSettingsRules;
  onReschedule: (lesson: LessonItem) => void;
  onCancel: (lesson: LessonItem) => void;
};

function UpcomingLessonItem({
  lesson,
  rescheduleOrCancelLabel,
  joinNowLabel,
  joinNowFailedLabel,
  messageLabel,
  cancelledLabel,
  appSettingsRules,
  onReschedule,
  onCancel,
}: UpcomingLessonItemProps) {
  const locale = useLocale();
  const currentUser = useAtomValue(userAtom);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [isJoining, setIsJoining] = useState(false);
  const senderId = currentUser?.id ?? "";
  const senderMezonUserId = currentUser?.mezonUserId ?? "";
  const tutorFirstName = lesson.tutor.trim().split(/\s+/)[0] ?? lesson.tutor;
  const t = useTranslations("MyLessons.panels.lessons.cancellation.options");
  const tUpcoming = useTranslations("MyLessons.panels.lessons.upcoming");
  const { lightClient, setLightClient } = useMezonLight();
  const { data: botContact } = useGetSupportBotContact();
  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, botContact?.id ?? '', false);
  const createDmChannelMutation = useCreateDmChannelMutation();
  const tGroups = useTranslations('Groups');
  const cancelled = isCancelledTrialLesson(lesson);
  const isInProgress = isLessonInProgress(lesson, now);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const canReschedule =
    isReschedulableTrialLesson(lesson, appSettingsRules) ||
    isReschedulableSubscriptionLesson(lesson, appSettingsRules);

  const showRescheduleNotice =
    !cancelled &&
    !isInProgress &&
    canShowRescheduleOrCancelMenu(lesson) &&
    !canReschedule &&
    Boolean(lesson.startAt) &&
    !isTrialLessonRescheduleEligible(
      lesson.startAt!,
      new Date(),
      appSettingsRules.lessonChangePeriodHours,
    );

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

  const handleJoinNow = async () => {
    if (!botContact) {
      toast.error("Bot contact is not loaded yet.");
      return;
    }
    try {
      setIsJoining(true);
      const existingChannelId = (await refetchDmChannel()).data?.channelId;
      const channelId = await ensureMezonDmChannel({
        lightClient,
        setLightClient,
        senderId,
        senderMezonUserId,
        recipientId: botContact.id,
        recipientMezonUserId: botContact.mezonUserId,
        existingChannelId,
        createDmChannelMutation,
      });
      window.open(MEZON_DIRECT_MESSAGE_URL(channelId), "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : joinNowFailedLabel,
      );
    } finally {
      setIsJoining(false);
    }
  };

  const messageButton = (
    <Button
      variant="gradient"
      className="h-11 w-full rounded-full px-4 text-xs font-semibold text-white sm:h-9 sm:w-auto sm:min-w-28"
      onClick={() => setIsMessageModalOpen(true)}
    >
      <MessageCircle className="mr-1 size-3.5" />
      {messageLabel}
    </Button>
  );

  const joinNowButton = (
    <Button
      variant="gradient"
      className="h-11 w-full rounded-full px-4 text-xs font-semibold text-white sm:h-9 sm:w-auto sm:min-w-28"
      onClick={() => void handleJoinNow()}
      disabled={isJoining}
    >
      <ExternalLink className="mr-1 size-3.5" />
      {joinNowLabel}
    </Button>
  );

  return (
    <>
    <div className="group flex w-full flex-col gap-0 rounded-2xl border border-violet-100 bg-white transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40">
      <div className="flex w-full flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <LessonPersonBadge name={lesson.tutor} avatar={lesson.tutorAvatar} />
          <div className="min-w-0 flex flex-col gap-0.5">
            {lesson.groupName && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-600">
                {tGroups('groupStudyPrefix')}: {lesson.groupName}
              </p>
            )}
            <p className="text-xs font-semibold text-violet-600">
              {formatLessonDateLabel(lesson.dateLabel, locale)}
            </p>
            <p className="text-lg font-extrabold leading-none text-slate-900">
              {lesson.timeLabel}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold text-violet-700">{lesson.subject}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="break-words">{lesson.tutor}</span>
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
          {cancelled ? (
            <LessonStatusBadge label={cancelledLabel} tone="neutral" />
          ) : (
            <>
              {isInProgress ? joinNowButton : null}
              {!isInProgress && canShowRescheduleOrCancelMenu(lesson) ? (
                <ActionMenu
                  trigger={
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 sm:h-9 sm:w-auto"
                    >
                      {rescheduleOrCancelLabel}
                    </Button>
                  }
                  items={actionItems}
                />
              ) : null}
              {messageButton}
            </>
          )}
        </div>
      </div>

      {showRescheduleNotice && (
        <div className="flex items-start gap-2.5 rounded-b-2xl border-t border-amber-100 bg-amber-50/70 px-4 py-3 sm:px-5">
          <Info className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-700">
            {tUpcoming("rescheduleNotice")}
          </p>
        </div>
      )}
    </div>

    <SendMessageModal
      open={isMessageModalOpen}
      title={tutorFirstName}
      senderId={senderId}
      senderMezonUserId={senderMezonUserId}
      recipientId={lesson.tutorUserId}
      recipientMezonUserId={lesson.tutorMezonUserId ?? ""}
      onOpenChangeAction={setIsMessageModalOpen}
    />
    </>
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
    <div className="relative w-full overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-6 sm:p-8">
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
  joinNowLabel: string;
  joinNowFailedLabel: string;
  messageLabel: string;
  cancelledLabel: string;
  appSettingsRules: AppSettingsRules;
  onReschedule: (lesson: LessonItem) => void;
  onCancel: (lesson: LessonItem) => void;
};

function LessonsSection({
  title,
  lessons,
  emptyState,
  rescheduleOrCancelLabel,
  joinNowLabel,
  joinNowFailedLabel,
  messageLabel,
  cancelledLabel,
  appSettingsRules,
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
                joinNowLabel={joinNowLabel}
                joinNowFailedLabel={joinNowFailedLabel}
                messageLabel={messageLabel}
                cancelledLabel={cancelledLabel}
                appSettingsRules={appSettingsRules}
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
  complainLabel: string;
  complaintPendingLabel: string;
  complaintTutorReviewRequestedLabel: string;
  complaintTutorConfirmedLabel: string;
  complaintTutorRejectedLabel: string;
  complaintApprovedLabel: string;
  complaintRejectedLabel: string;
  appSettingsRules: AppSettingsRules;
  onRate: (tutorId: string) => void;
  onComplain: (lesson: LessonItem) => void;
  contactSupportLabel: string;
  isOpeningSupportChat: boolean;
  onContactSupport: () => void;
};

function PastLessonsSection({
  title,
  lessons,
  rateLabel,
  ratedLabel,
  cancelledLabel,
  complainLabel,
  complaintPendingLabel,
  complaintTutorReviewRequestedLabel,
  complaintTutorConfirmedLabel,
  complaintTutorRejectedLabel,
  complaintApprovedLabel,
  complaintRejectedLabel,
  appSettingsRules,
  onRate,
  onComplain,
  contactSupportLabel,
  isOpeningSupportChat,
  onContactSupport,
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
            key={`${lesson.id}-${lesson.subscriptionSlotIndex ?? ""}-${lesson.startAt ?? ""}`}
            lesson={lesson}
            rateLabel={rateLabel}
            ratedLabel={ratedLabel}
            cancelledLabel={cancelledLabel}
            complainLabel={complainLabel}
            complaintPendingLabel={complaintPendingLabel}
            complaintTutorReviewRequestedLabel={complaintTutorReviewRequestedLabel}
            complaintTutorConfirmedLabel={complaintTutorConfirmedLabel}
            complaintTutorRejectedLabel={complaintTutorRejectedLabel}
            complaintApprovedLabel={complaintApprovedLabel}
            complaintRejectedLabel={complaintRejectedLabel}
            appSettingsRules={appSettingsRules}
            onRate={onRate}
            onComplain={onComplain}
            contactSupportLabel={contactSupportLabel}
            isOpeningSupportChat={isOpeningSupportChat}
            onContactSupport={onContactSupport}
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
  const locale = useLocale();
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
  const createComplaintMutation = useCreateLessonComplaintMutation();
  const { openAdminSupportChat, isOpening: isOpeningSupportChat } =
    useOpenAdminSupportChat();
  const userTimezone = useUserTimezone();
  const { data: publicAppSettings } = usePublicAppSettings();
  const appSettingsRules: AppSettingsRules = {
    disputePeriodHours:
      publicAppSettings?.disputePeriodHours ??
      PUBLIC_APP_SETTINGS_FALLBACK.disputePeriodHours,
    lessonChangePeriodHours:
      publicAppSettings?.lessonChangePeriodHours ??
      PUBLIC_APP_SETTINGS_FALLBACK.lessonChangePeriodHours,
  };

  const [isComplainDialogOpen, setIsComplainDialogOpen] = useState(false);
  const [complainLesson, setComplainLesson] = useState<LessonItem | null>(null);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  const [rescheduleLesson, setRescheduleLesson] = useState<LessonItem | null>(null);
  const [rescheduleSubscriptionLesson, setRescheduleSubscriptionLesson] =
    useState<LessonItem | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const { data: rescheduleTutorAbout } = useGetVerifiedTutorAbout(
    rescheduleLesson?.tutorId ?? "",
  );

  const handleReschedule = (lesson: LessonItem) => {
    if (lesson.source === "subscription") {
      if (!isReschedulableSubscriptionLesson(lesson, appSettingsRules)) {
        toast.error(t("panels.lessons.reschedule.within12Hours"));
        return;
      }
      setRescheduleSubscriptionLesson(lesson);
      return;
    }
    if (!isReschedulableTrialLesson(lesson, appSettingsRules)) {
      toast.error(t("panels.lessons.reschedule.within12Hours"));
      return;
    }
    setRescheduleLesson(lesson);
  };

  const tCancelReasons = useTranslations("MyLessons.panels.lessons.cancellation");

  const cancelReasonLabel = (reasonKey: string) => {
    const labels: Record<string, string> = {
      timeNotWork: tCancelReasons("reasons.timeNotWork"),
      technicalIssue: tCancelReasons("reasons.technicalIssue"),
      avoidBalanceLoss: tCancelReasons("reasons.avoidBalanceLoss"),
      notMotivated: tCancelReasons("reasons.notMotivated"),
      tutorRescheduledUnavail: tCancelReasons("reasons.tutorRescheduledUnavail"),
      tutorAskedCancel: tCancelReasons("reasons.tutorAskedCancel"),
      noLongerLearnTutor: tCancelReasons("reasons.noLongerLearnTutor"),
      other: tCancelReasons("reasons.other"),
    };
    return labels[reasonKey] ?? reasonKey;
  };

  const handleConfirmReschedule = async (payload: TrialBookingPayload) => {
    if (!rescheduleLesson) return;

    const originalStartAt = rescheduleLesson.startAt;
    const durationMinutes = rescheduleLesson.durationMinutes ?? payload.duration;

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

      if (originalStartAt && rescheduleLesson.tutorMezonUserId) {
        const lessonForDm = rescheduleLesson;
        void sendStudentLessonDmToTutor({
          lightClient,
          setLightClient,
          senderId,
          senderMezonUserId,
          recipientId: lessonForDm.tutorUserId,
          recipientMezonUserId: lessonForDm.tutorMezonUserId ?? "",
          refetchDmChannel: async () => {
            const r = await refetchDmChannel();
            return { data: r.data ?? null };
          },
          createDmChannelMutation,
          content: buildStudentLessonRescheduledDmContent({
            lessonKind: "trial",
            originalLabel: formatLessonRangeInTimezone(
              originalStartAt,
              durationMinutes,
              userTimezone,
              locale,
            ),
            newLabel: formatLessonRangeInTimezone(
              payload.startAt,
              payload.duration,
              userTimezone,
              locale,
            ),
            locale,
            senderAvatarUrl: currentUser?.avatar,
          }),
        }).catch((dmError) => {
          console.error("DM Error:", dmError);
          toast.error(t("panels.lessons.cancellation.dialog.messageFailed"));
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : t("panels.lessons.reschedule.failed"),
      );
      throw error;
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelClick = (lesson: LessonItem) => {
    setSelectedLesson(lesson);
    setIsCancelDialogOpen(true);
  };

  const handleComplainClick = (lesson: LessonItem) => {
    setComplainLesson(lesson);
    setIsComplainDialogOpen(true);
  };

  const handleConfirmComplaint = async (
    reason: string,
    message?: string,
    attachments?: { url: string; publicId: string }[],
  ) => {
    if (!complainLesson) return;

    try {
      setIsSubmittingComplaint(true);
      if (complainLesson.source === "subscription") {
        const enrollmentId = complainLesson.subscriptionEnrollmentId;
        const slotIndex = complainLesson.subscriptionSlotIndex;
        if (enrollmentId == null || slotIndex == null || !complainLesson.startAt) {
          throw new Error("Missing subscription lesson reference");
        }
        await createComplaintMutation.mutateAsync({
          lessonType: "SUBSCRIPTION",
          subscriptionEnrollmentId: enrollmentId,
          subscriptionSlotIndex: slotIndex,
          lessonStartAt: complainLesson.startAt,
          reason,
          message,
          attachments,
        });
      } else {
        await createComplaintMutation.mutateAsync({
          lessonType: "TRIAL",
          trialLessonBookingId: complainLesson.id,
          reason,
          message,
          attachments,
        });
      }
      toast.success(t("panels.lessons.complaint.dialog.success"));
      setIsComplainDialogOpen(false);
      setComplainLesson(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : t("panels.lessons.complaint.dialog.failed"),
      );
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const handleConfirmCancel = async (reason: string, message?: string) => {
    if (!selectedLesson) return;

    const lessonForDm = selectedLesson;
    const durationMinutes = lessonForDm.durationMinutes ?? 60;

    try {
      setIsCanceling(true);

      if (selectedLesson.source === "subscription") {
        const enrollmentId = selectedLesson.subscriptionEnrollmentId;
        const slotIndex = selectedLesson.subscriptionSlotIndex;
        if (enrollmentId == null || slotIndex == null) {
          throw new Error("Missing subscription lesson reference");
        }
        await cancelSubscriptionMutation.mutateAsync({
          enrollmentId,
          slotIndex,
          payload: { reason, message: message?.trim() },
        });
        await queryClient.invalidateQueries({ queryKey: ["my-lessons"] });
        toast.success(t("panels.lessons.subscription.cancellation.dialog.successNoCredit"));
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

      if (lessonForDm.startAt && lessonForDm.tutorMezonUserId) {
        try {
          const dmContent = buildStudentLessonCancelledDmContent({
            lessonKind: lessonForDm.source === "subscription" ? "subscription" : "trial",
            originalLabel: formatLessonRangeInTimezone(
              lessonForDm.startAt,
              durationMinutes,
              userTimezone,
              locale,
            ),
            reasonLabel: cancelReasonLabel(reason),
            message,
            locale,
            senderAvatarUrl: currentUser?.avatar,
          });
          await sendStudentLessonDmToTutor({
            lightClient,
            setLightClient,
            senderId,
            senderMezonUserId,
            recipientId: lessonForDm.tutorUserId,
            recipientMezonUserId: lessonForDm.tutorMezonUserId ?? "",
            refetchDmChannel: async () => {
              const r = await refetchDmChannel();
              return { data: r.data ?? null };
            },
            createDmChannelMutation,
            content: dmContent,
          });
        } catch (dmError) {
          console.error("DM Error:", dmError);
          toast.error(t("panels.lessons.cancellation.dialog.messageFailed"));
        }
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
    <div className="ml-0 flex w-full max-w-full flex-col gap-7 lg:max-w-[1032px]">
      <LessonsSection
        title={t("panels.lessons.upcoming.title")}
        lessons={upcomingLessons}
        rescheduleOrCancelLabel={t(
          "panels.lessons.upcoming.rescheduleOrCancel",
        )}
        joinNowLabel={t("panels.lessons.upcoming.joinLesson")}
        joinNowFailedLabel={t("panels.lessons.upcoming.joinNowFailed")}
        messageLabel={t("panels.tutors.message")}
        cancelledLabel={t("panels.lessons.upcoming.statusCancelled")}
        appSettingsRules={appSettingsRules}
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
          complainLabel={t("panels.lessons.complaint.action")}
          complaintPendingLabel={t("panels.lessons.complaint.statusPending")}
          complaintTutorReviewRequestedLabel={t(
            "panels.lessons.complaint.statusTutorReviewRequested",
          )}
          complaintTutorConfirmedLabel={t("panels.lessons.complaint.statusTutorConfirmed")}
          complaintTutorRejectedLabel={t("panels.lessons.complaint.statusTutorRejected")}
          complaintApprovedLabel={t("panels.lessons.complaint.statusApproved")}
          complaintRejectedLabel={t("panels.lessons.complaint.statusRejected")}
          appSettingsRules={appSettingsRules}
          onRate={handleRate}
          onComplain={handleComplainClick}
          contactSupportLabel={
            isOpeningSupportChat
              ? t("panels.lessons.complaint.supportChat.opening")
              : t("panels.lessons.complaint.supportChat.contactSupport")
          }
          isOpeningSupportChat={isOpeningSupportChat}
          onContactSupport={() => void openAdminSupportChat()}
        />
      )}

      <CancelLessonDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancel}
        lesson={selectedLesson}
        isLoading={isCanceling}
      />

      <ComplainLessonDialog
        isOpen={isComplainDialogOpen}
        onClose={() => {
          setIsComplainDialogOpen(false);
          setComplainLesson(null);
        }}
        onConfirm={handleConfirmComplaint}
        lesson={complainLesson}
        isLoading={isSubmittingComplaint}
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
