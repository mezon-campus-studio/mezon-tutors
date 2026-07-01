'use client';

import {
  ArrowRight,
  Calendar,
  Clock,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Badge, Button } from '@/components/ui';
import { useTrustShowcaseAvatars } from '@/services/user/user.api';

const TRUST_SHOWCASE_AVATAR_MAX = 4;

function formatTutorCountBadge(count: number): string {
  if (count >= 1000) {
    const value = count / 1000;
    if (value >= 10) return `${Math.floor(value)}k`;
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
  }
  return String(count);
}

export default function HomeHeroSection() {
  const t = useTranslations('Home.Hero');
  const { data: trustShowcase, isPending, isError } = useTrustShowcaseAvatars();

  const trustAvatars = useMemo(
    () => trustShowcase?.avatars.slice(0, TRUST_SHOWCASE_AVATAR_MAX) ?? [],
    [trustShowcase?.avatars]
  );
  const totalTutors = trustShowcase?.tutor ?? 0;
  const tutorOverflowCount = Math.max(0, totalTutors - trustAvatars.length);
  const showTrustShowcase = !isPending && !isError && trustAvatars.length > 0;

  const heroHighlights = [
    `${t('proof.verified.value')} ${t('proof.verified.label')}`,
    `4.9 ${t('proof.rating.label')}`,
    `${t('proof.response.value')} ${t('proof.response.label')}`,
  ];

  return (
    <section className="relative w-full max-w-full overflow-x-clip border-b border-slate-100 bg-white pt-8 pb-14 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_56%,#ffffff_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,rgba(124,58,237,0.1),rgba(168,85,247,0.08),rgba(236,72,153,0.06))]" />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)',
            backgroundSize: '34px 34px',
            maskImage: 'linear-gradient(180deg, black 0%, black 42%, transparent 85%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(480px,520px)] lg:gap-14 lg:px-10">
        <div className="max-w-2xl space-y-6">
          <Badge className="h-auto rounded-full border border-violet-200 bg-white px-4 py-1.5 text-xs font-semibold text-violet-800 shadow-sm shadow-violet-200/40">
            <Sparkles className="mr-1.5 size-3.5 shrink-0 text-violet-600" />
            <span>{t('badge')}</span>
          </Badge>

          <div className="space-y-5">
            <h1 className="max-w-[42rem] text-balance text-3xl leading-[1.22] font-extrabold tracking-normal text-slate-950 sm:text-4xl sm:leading-[1.18] lg:text-5xl lg:leading-[1.14]">
              <span className="block">{t('title')}</span>
              <span className="block pb-1 bg-brand-gradient bg-clip-text text-transparent sm:pb-1.5">
                {t('titleHighlightLead')}
              </span>
              <span className="block">{t('titleHighlightTail')}</span>
            </h1>

            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {t('description')}
            </p>
          </div>

          <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-2 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-h-12 flex-1 items-center gap-3 rounded-md bg-slate-50 px-4 text-left">
                <Search className="size-5 shrink-0 text-violet-600" />
                <p className="min-w-0 truncate text-sm font-medium text-slate-600">
                  {t('search.placeholder')}
                </p>
              </div>
              <Link
                href="/tutors"
                className="shrink-0"
              >
                <Button className="h-12 w-full border-none rounded-md bg-brand-gradient px-5 text-sm font-semibold text-white shadow-lg shadow-violet-300/40 transition-transform hover:scale-[1.01] hover:shadow-violet-400/50 active:scale-[0.99] sm:w-auto">
                  {t('search.submit')}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-slate-600">
            {heroHighlights.map((highlight) => (
              <span
                key={highlight}
                className="inline-flex items-center gap-2"
              >
                <span className="size-1.5 rounded-full bg-violet-500" />
                {highlight}
              </span>
            ))}
          </div>

          {showTrustShowcase ? (
            <div className="flex max-w-xl items-center gap-4">
              <div className="flex -space-x-2">
                {trustAvatars.map((avatar, index) => (
                  <div
                    key={avatar.id}
                    style={{ zIndex: index + 1 }}
                    className="relative flex size-10 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-slate-100 shadow-sm ring-1 ring-black/5"
                  >
                    <img
                      src={avatar.url}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
                {tutorOverflowCount > 0 ? (
                  <div className="relative z-50 flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-violet-50 text-[10px] font-bold text-violet-800 shadow-sm ring-1 ring-violet-200/60">
                    +{formatTutorCountBadge(tutorOverflowCount)}
                  </div>
                ) : null}
              </div>
              <p className="text-sm leading-5 font-medium text-slate-600">{t('trust')}</p>
            </div>
          ) : null}
        </div>

        <HomeTutorSearchPreview t={t} />
      </div>
    </section>
  );
}

function HomeTutorSearchPreview({ t }: { t: (key: string) => string }) {
  const timeSlots = ['18:00', '19:00', '20:00', '21:00'];
  const selectedSlot = '19:00';

  const steps = useMemo(
    () => [
      { label: t('searchPanel.steps.filter'), icon: Search },
      { label: t('searchPanel.steps.compare'), icon: Star },
      { label: t('searchPanel.steps.book'), icon: Calendar },
    ],
    [t]
  );

  return (
    <div className="relative mx-auto w-full lg:mx-0 lg:max-w-none motion-safe:[animation:hero-card-float_6s_ease-in-out_infinite] motion-reduce:animate-none">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_22px_56px_-32px_rgba(15,23,42,0.38)] sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,#faf5ff_0%,transparent_100%)]" />

        <div className="relative">
          <p className="text-xs font-bold tracking-[0.16em] text-violet-700 uppercase">
            {t('searchPanel.kicker')}
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-950 sm:text-2xl">
            {t('searchPanel.title')}
          </h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {steps.map(({ label, icon: Icon }, index) => {
              const isActive = index === 0;

              return (
                <div
                  key={label}
                  className={`rounded-lg px-4 py-4 ${
                    isActive
                      ? 'bg-brand-gradient text-white shadow-lg shadow-violet-300/35'
                      : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80'
                  }`}
                >
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      isActive ? 'bg-white/20' : 'bg-white ring-1 ring-slate-200/80'
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? 'text-white' : 'text-violet-500/70'}`} />
                  </div>
                  <p className="mt-3 text-xs leading-5 font-bold sm:text-sm">{label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-violet-800">
                <Clock className="size-4" />
                {t('searchPanel.filters.time.label')}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
                {t('searchPanel.filters.time.value')}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {timeSlots.map((slot) => {
                const isSelected = slot === selectedSlot;

                return (
                  <div
                    key={slot}
                    className={`rounded-lg py-3 text-center text-sm font-extrabold ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200/70'
                        : 'bg-white text-violet-700 ring-1 ring-violet-100'
                    }`}
                  >
                    {slot}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
