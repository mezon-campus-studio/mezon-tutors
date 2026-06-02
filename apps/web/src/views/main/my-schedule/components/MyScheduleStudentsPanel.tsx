'use client';

import {
  CalendarPlus,
  CheckCircle2,
  MessageCircle,
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
          <AvatarFallback className="rounded-2xl bg-linear-to-br from-violet-600 to-fuchsia-600 text-base font-bold text-white">
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

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  {t('completed')}
                </p>
                <p className="text-xs font-extrabold text-emerald-900">
                  {t('lessonsCount', { count: student.completedLessons })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-3 py-1.5">
              <CalendarPlus className="size-3.5 text-violet-600" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  {t('nextLesson')}
                </p>
                <p className="text-xs font-extrabold text-violet-900">{displayNextLesson}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-end">
        {student.upcomingLessons > 0 ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sky-50 px-3 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
            {t('upcomingCount', { count: student.upcomingLessons })}
          </span>
        ) : null}

        <Button
          type="button"
          onClick={() => onMessage(student)}
          className="h-9 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-4 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 sm:min-w-28"
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
      <div className="flex w-full max-w-[1032px] flex-col gap-5">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
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

          <Button
            type="button"
            onClick={() => router.push(ROUTES.DASHBOARD.TRIAL_BOOKING)}
            className="h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
          >
            {t('viewBookings')}
          </Button>
        </div>

        {students.length === 0 ? (
          <div className="rounded-2xl border border-violet-100 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">{t('emptyTitle')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('emptyDescription')}</p>
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
