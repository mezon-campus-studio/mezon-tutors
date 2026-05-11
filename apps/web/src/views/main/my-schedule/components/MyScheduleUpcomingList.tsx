'use client';

import { ECurrency, ROUTES, formatToCurrency } from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import { CalendarPlus, Clock4, Sparkles, Video } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@/components/ui';
import type { TrialLessonBookingRequestItem } from '@/services';

type MyScheduleUpcomingListProps = {
  items: TrialLessonBookingRequestItem[];
};

const getInitials = (name?: string) => {
  if (!name) return 'S';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S';
};

export default function MyScheduleUpcomingList({
  items,
}: MyScheduleUpcomingListProps) {
  const t = useTranslations('Dashboard.mySchedule.upcoming');
  const locale = useLocale();

  return (
    <aside className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
          <CalendarPlus className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
            {t('eyebrow')}
          </p>
          <h2 className="text-lg font-extrabold text-slate-900 md:text-xl">
            {t('title')}
            {items.length > 0 ? (
              <span className="ml-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-violet-100 px-2 text-xs font-bold text-violet-700">
                {items.length}
              </span>
            ) : null}
          </h2>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-6">
          <div className="pointer-events-none absolute -top-12 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="relative flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
              <Sparkles className="size-4" />
            </div>
            <p className="text-base font-extrabold text-slate-900">
              {t('emptyTitle')}
            </p>
            <p className="text-xs text-slate-600">{t('emptyDescription')}</p>
          </div>
        </div>
      ) : (
        <div className="flex max-h-[640px] flex-col gap-3 overflow-y-auto pr-1">
          {items.map((item) => {
            const start = dayjs(item.startAt).locale(locale);
            const end = start.add(item.durationMinutes, 'minute');
            return (
              <div
                key={item.id}
                className="group flex w-full flex-col gap-3 rounded-2xl border border-violet-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="size-12 rounded-xl border border-violet-100">
                    {item.studentAvatarUrl ? (
                      <AvatarImage
                        src={item.studentAvatarUrl}
                        alt={item.studentName}
                        className="rounded-lg object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
                      {getInitials(item.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-violet-600">
                      {start.format('ddd, MMM DD')}
                    </p>
                    <p className="text-base font-extrabold leading-tight text-slate-900">
                      {start.format('HH:mm')} - {end.format('HH:mm')}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-600">
                      {item.studentName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-violet-50 pt-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                    <Clock4 className="size-3" />
                    {t('durationLabel', { minutes: item.durationMinutes })}
                  </div>
                  <span className="text-xs font-bold text-violet-700">
                    {formatToCurrency(ECurrency.VND, item.tutorAmount)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(item.id)}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      className="h-9 w-full rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                    >
                      {t('viewDetail')}
                    </Button>
                  </Link>
                  <Button className="h-9 flex-1 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50">
                    <Video className="mr-1.5 size-3.5" />
                    {t('joinLesson')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
