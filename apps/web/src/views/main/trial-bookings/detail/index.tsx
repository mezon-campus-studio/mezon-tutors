'use client';

import { ECurrency, ROUTES, formatToCurrency } from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
  ArrowLeft,
  CalendarDays,
  Clock4,
  CreditCard,
  Mail,
  MessageCircle,
  Receipt,
  Share2,
  User2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { detectBrowserTimezone, resolveUserTimezone } from '@/lib/timezone';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Skeleton,
} from '@/components/ui';
import {
  useGetMyTrialLessonBookingRequests,
  type TrialLessonBookingRequestItem,
} from '@/services';
import { userAtom } from '@/store';
import BookingRequestStatusBadge from '../components/BookingRequestStatusBadge';

type BookingRequestDetailViewProps = {
  bookingId: string;
};

dayjs.extend(utc);
dayjs.extend(timezone);

const getInitials = (name?: string) => {
  if (!name) return 'S';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S';
};

export default function BookingRequestDetailView({
  bookingId,
}: BookingRequestDetailViewProps) {
  const t = useTranslations('Dashboard.bookingRequestDetail');
  const tList = useTranslations('Dashboard.bookingRequests');
  const router = useRouter();
  const locale = useLocale();
  const user = useAtomValue(userAtom);
  const userTimezone = resolveUserTimezone(
    user?.timezone,
    detectBrowserTimezone(),
  );

  const { data, isLoading } = useGetMyTrialLessonBookingRequests({
    page: 1,
    limit: 100,
  });

  const booking: TrialLessonBookingRequestItem | undefined = useMemo(
    () => data?.items.find((item) => item.id === bookingId),
    [data, bookingId],
  );

  const start = booking
    ? dayjs.utc(booking.startAt).tz(userTimezone).locale(locale)
    : null;
  const end =
    start && booking ? start.add(booking.durationMinutes, 'minute') : null;
  const created = booking
    ? dayjs.utc(booking.createdAt).tz(userTimezone).locale(locale)
    : null;

  if (isLoading) {
    return (
      <div className="mx-auto w-full px-4 py-6 md:px-7 md:py-8">
        <Skeleton className="mb-6 h-9 w-40 rounded-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!booking || !start || !end || !created) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 py-12 text-center md:py-20">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <XCircle className="size-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
          {t('notFound.title')}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{t('notFound.description')}</p>
        <Link href={ROUTES.DASHBOARD.TRIAL_BOOKING}>
          <Button className="mt-6 h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-sm font-semibold text-white">
            {t('notFound.back')}
          </Button>
        </Link>
      </div>
    );
  }

  const dateLabel = start.format('dddd, MMMM DD, YYYY');
  const timeLabel = `${start.format('HH:mm')} - ${end.format('HH:mm')}`;

  return (
    <div className="mx-auto w-full px-4 py-6 md:px-7 md:py-8">
      <button
        type="button"
        onClick={() => router.push(ROUTES.DASHBOARD.TRIAL_BOOKING)}
        className="group mb-5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-violet-100/40 transition-all hover:border-violet-200 hover:text-violet-700"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        {t('back')}
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
            <div className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#7c3aed_0%,#9333ea_45%,#db2777_100%)] px-6 py-7 text-white">
              <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-12 size-48 rounded-full bg-fuchsia-300/30 blur-3xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16 rounded-2xl border-2 border-white/40 ring-2 ring-white/20">
                    {booking.studentAvatarUrl ? (
                      <AvatarImage
                        src={booking.studentAvatarUrl}
                        alt={booking.studentName}
                        className="rounded-xl object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-white/20 text-base font-bold text-white">
                      {getInitials(booking.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                      {t('header.eyebrow')}
                    </p>
                    <h1 className="text-xl font-extrabold leading-tight md:text-2xl">
                      {booking.studentName}
                    </h1>
                    <p className="mt-0.5 text-xs text-white/70">
                      {t('header.requestedAt', {
                        date: created.format('MMM DD, YYYY · HH:mm'),
                      })}
                    </p>
                  </div>
                </div>
                <BookingRequestStatusBadge
                  status={booking.status}
                  className="self-start border-white/40 bg-white/15 text-white sm:self-auto"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <InfoRow
                icon={CalendarDays}
                label={t('overview.date')}
                value={dateLabel}
              />
              <InfoRow
                icon={Clock4}
                label={t('overview.time')}
                value={timeLabel}
              />
              <InfoRow
                icon={Receipt}
                label={t('overview.duration')}
                value={t('overview.durationValue', {
                  minutes: booking.durationMinutes,
                })}
              />
              <InfoRow
                icon={CreditCard}
                label={t('overview.payout')}
                value={formatToCurrency(ECurrency.VND, booking.tutorAmount)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm shadow-violet-100/40">
            <h2 className="text-base font-extrabold text-slate-900">
              {t('breakdown.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t('breakdown.subtitle')}
            </p>

            <div className="mt-4 divide-y divide-violet-50 rounded-2xl border border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)]">
              <BreakdownRow
                label={t('breakdown.gross')}
                value={formatToCurrency(ECurrency.VND, booking.grossAmount)}
              />
              <BreakdownRow
                label={t('breakdown.platformFee')}
                value={`- ${formatToCurrency(ECurrency.VND, booking.platformFee)}`}
                muted
              />
              <BreakdownRow
                label={t('breakdown.tutorAmount')}
                value={formatToCurrency(ECurrency.VND, booking.tutorAmount)}
                emphasis
              />
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm shadow-violet-100/40">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-violet-600">
              {t('student.title')}
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <User2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t('student.name')}
                  </p>
                  <p className="truncate font-semibold text-slate-900">
                    {booking.studentName}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t('student.contact')}
                  </p>
                  <p className="truncate text-sm text-slate-600">
                    {t('student.contactHint')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm shadow-violet-100/40">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-violet-600">
              {t('actions.title')}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{t('actions.hint')}</p>

            <div className="mt-4 flex flex-col gap-2.5">
              <Button
                variant="outline"
                className="h-11 rounded-full border-violet-200 bg-white text-sm font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50"
              >
                <MessageCircle className="mr-2 size-4" />
                {tList('actions.message')}
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-full border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                <Share2 className="mr-2 size-4" />
                {t('actions.share')}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

type InfoRowProps = {
  icon: typeof CalendarDays;
  label: string;
  value: string;
};

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 ring-1 ring-violet-100">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

type BreakdownRowProps = {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
};

function BreakdownRow({ label, value, emphasis, muted }: BreakdownRowProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-slate-700">{label}</span>
      <span
        className={`text-sm ${
          emphasis
            ? 'text-base font-extrabold text-violet-700'
            : muted
              ? 'font-semibold text-slate-500'
              : 'font-semibold text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
