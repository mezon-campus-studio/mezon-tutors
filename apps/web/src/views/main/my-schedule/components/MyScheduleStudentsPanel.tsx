'use client';

import {
  CalendarPlus,
  CheckCircle2,
  MessageCircle,
  Plus,
  UserRound,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@/components/ui';
import { formatTutorNextLessonLabel } from '@/components/calendar/utils/format-locale';
import { SendMessageModal } from '@/components/common/SendMessageModal';
import { getAvatarGradient } from '@/lib/avatar-utils';
import { useUserTimezone } from '@/hooks';
import { ROUTES } from '@mezon-tutors/shared';
import { userAtom } from '@/store';
import type { ScheduleStudentItem } from '../utils/build-student-items';

type StudentCardProps = {
  student: ScheduleStudentItem;
  onMessage: (student: ScheduleStudentItem) => void;
};

const initials = (name?: string) => {
  if (!name?.trim()) return 'S';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'S'
  );
};

function StudentCard({ student, onMessage }: StudentCardProps) {
  const t = useTranslations('Dashboard.mySchedule.panels.students');
  const locale = useLocale();
  const userTimezone = useUserTimezone();

  const lessonTypes: string[] = [];
  if (student.hasTrial) lessonTypes.push(t('lessonTypeTrial'));
  if (student.hasSubscription) lessonTypes.push(t('lessonTypePlan'));
  const lessonTypesLabel = lessonTypes.join(' · ') || t('lessonTypeTrial');

  const displayNextLesson = student.nextLessonAt
    ? formatTutorNextLessonLabel('', locale, userTimezone, student.nextLessonAt)
    : t('unscheduled');

  return (
    <div className="group flex w-full flex-col gap-4 rounded-2xl border border-violet-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex flex-1 items-start gap-4 text-left">
        <Avatar className="size-16 shrink-0 rounded-2xl sm:size-20">
          {student.avatarUrl ? (
            <AvatarImage
              src={student.avatarUrl}
              alt={student.name}
              className="rounded-2xl object-cover"
            />
          ) : null}
          <AvatarFallback className={`rounded-2xl bg-linear-to-br ${student.hasSubscription ? getAvatarGradient('subscription') : getAvatarGradient('trial')} text-base font-bold text-white`}>
            {initials(student.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h3 className="truncate text-base font-extrabold text-slate-900 sm:text-lg">
              {student.name}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
              <UserRound className="size-3" />
              {lessonTypesLabel}
            </span>
          </div>

          <div className="flex flex-nowrap gap-2 sm:flex-wrap sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-2 py-1 sm:w-auto sm:flex-none sm:gap-2 sm:px-3 sm:py-1.5">
              <CheckCircle2 className="size-3 shrink-0 text-emerald-600 sm:size-3.5" />
              <div className="min-w-0 leading-tight sm:min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-emerald-600 sm:overflow-visible sm:whitespace-normal sm:text-[10px] sm:tracking-wider">
                  {t('completed')}
                </p>
                <p className="truncate text-[10px] font-extrabold text-emerald-900 sm:overflow-visible sm:whitespace-normal sm:text-xs">
                  {t('lessonsCount', { count: student.completedLessons })}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-violet-100 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-2 py-1 sm:w-auto sm:flex-none sm:gap-2 sm:px-3 sm:py-1.5">
              <CalendarPlus className="size-3 shrink-0 text-violet-600 sm:size-3.5" />
              <div className="min-w-0 leading-tight sm:min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-violet-600 sm:overflow-visible sm:whitespace-normal sm:text-[10px] sm:tracking-wider">
                  {t('nextLesson')}
                </p>
                <p className="truncate text-[10px] font-extrabold text-violet-900 sm:overflow-visible sm:whitespace-normal sm:text-xs">
                  {displayNextLesson}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {student.upcomingLessons > 0 ? (
          <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-sky-50 px-3 text-xs font-bold text-sky-700 ring-1 ring-sky-100 sm:h-9">
            {t('upcomingCount', { count: student.upcomingLessons })}
          </span>
        ) : null}

        <Button
          variant="gradient"
          onClick={() => onMessage(student)}
          className="h-11 rounded-full px-4"
        >
          <MessageCircle className="mr-1 size-3.5" />
          {t('message')}
        </Button>
      </div>
    </div>
  );
}

type MyScheduleStudentsPanelProps = {
  students: ScheduleStudentItem[];
};

export default function MyScheduleStudentsPanel({ students }: MyScheduleStudentsPanelProps) {
  const t = useTranslations('Dashboard.mySchedule.panels.students');
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const [messageStudent, setMessageStudent] = useState<ScheduleStudentItem | null>(null);

  const studentPeerFirstName = messageStudent?.name.trim().split(/\s+/)[0] ?? '';

  return (
    <>
      <div className="flex w-full max-w-full flex-col gap-5 lg:max-w-[1032px]">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
              <Users className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                {t('eyebrow')}
              </p>
              <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">{t('title')}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t('subtitle', { count: students.length })}
              </p>
            </div>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="relative mt-2 overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-12 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />

            <div className="relative flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-xl" />
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40">
                  <Users className="size-5" />
                </div>
              </div>

              <h3 className="max-w-lg text-balance text-xl font-extrabold text-slate-900 sm:text-2xl">
                {t('emptyTitle')}
              </h3>
              <p className="max-w-md text-sm text-slate-600">
                {t('emptyDescription')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onMessage={setMessageStudent}
              />
            ))}
          </div>
        )}
      </div>

      <SendMessageModal
        open={messageStudent !== null}
        title={studentPeerFirstName}
        senderId={user?.id ?? ''}
        senderMezonUserId={user?.mezonUserId ?? ''}
        recipientId={messageStudent?.id ?? ''}
        recipientMezonUserId={messageStudent?.mezonUserId ?? ''}
        onOpenChangeAction={(open) => {
          if (!open) setMessageStudent(null);
        }}
      />
    </>
  );
}
