"use client";

import {
  CalendarPlus,
  CalendarX,
  History,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { formatLessonDateLabel } from "@/components/calendar/utils/format-locale";
import type { LessonItem } from "@/services/my-lessons/my-lessons.api";

type LessonPersonBadgeProps = {
  name: string;
  avatar: string;
};

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
  onRate: (tutorId: string) => void;
};

function PastLessonListItem({
  lesson,
  rateLabel,
  ratedLabel,
  onRate,
}: PastLessonListItemProps) {
  const locale = useLocale();
  const rated = lesson.rating !== undefined;

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
      </div>
    </div>
  );
}

type UpcomingLessonItemProps = {
  lesson: LessonItem;
  rescheduleOrCancelLabel: string;
  joinLessonLabel: string;
};

function UpcomingLessonItem({
  lesson,
  rescheduleOrCancelLabel,
  joinLessonLabel,
}: UpcomingLessonItemProps) {
  const locale = useLocale();
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
        <Button
          variant="outline"
          className="h-9 rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
        >
          {rescheduleOrCancelLabel}
        </Button>
        <Button className="group/btn h-9 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50">
          <Video className="mr-1.5 size-3.5" />
          {joinLessonLabel}
        </Button>
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
};

function LessonsSection({
  title,
  lessons,
  emptyState,
  rescheduleOrCancelLabel,
  joinLessonLabel,
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
  onRate: (tutorId: string) => void;
};

function PastLessonsSection({
  title,
  lessons,
  rateLabel,
  ratedLabel,
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

  const handleRate = (tutorId: string) => {
    router.push(`/tutors/${tutorId}`);
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
          onRate={handleRate}
        />
      )}
    </div>
  );
}
