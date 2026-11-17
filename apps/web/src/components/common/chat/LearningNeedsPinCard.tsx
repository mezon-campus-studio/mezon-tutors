'use client';

import { getLearningNeedsSubjectCategory, ROUTES } from '@mezon-tutors/shared';
import { AlertCircle, ChevronRight, Loader2, Pencil, Pin, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { useGetCurrentLearningNeedsPin } from '@/services/learning-needs/learning-needs.api';
import { LearningNeedsDialog } from '@/views/main/learning-needs/LearningNeedsDialog';

type LearningNeedsPinCardProps = {
  channelId: string;
  enabled: boolean;
  onRequestChatClose?: () => void;
};

function subjectOptionNamespace(subject: string) {
  const category = getLearningNeedsSubjectCategory(subject);
  if (category === 'language') return 'options';
  if (category === 'stem') return 'optionsStem';
  if (category === 'creative') return 'optionsCreative';
  return 'optionsGeneral';
}

function formatUpdatedAt(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function LearningNeedsPinCard({
  channelId,
  enabled,
  onRequestChatClose,
}: LearningNeedsPinCardProps) {
  const t = useTranslations('LearningNeeds.chat');
  const tGeneral = useTranslations('LearningNeeds');
  const locale = useLocale();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isPending, isError, isFetching, refetch } = useGetCurrentLearningNeedsPin(
    channelId,
    enabled
  );

  const updatedAt = useMemo(
    () => (data?.shared ? formatUpdatedAt(data.shared.updatedAt, locale) : null),
    [data?.shared, locale]
  );

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setDialogOpen(nextOpen);
    if (!nextOpen) {
      void refetch();
    }
  };

  const openEditPage = (bookingId: string) => {
    setDialogOpen(false);
    onRequestChatClose?.();
    router.push(ROUTES.DASHBOARD.LEARNING_NEEDS(bookingId));
  };

  if (isPending && !data) {
    return (
      <div
        className="flex shrink-0 items-center gap-3 border-b border-violet-100 bg-white px-4 py-3 sm:px-5"
        aria-live="polite"
      >
        <Loader2
          className="size-4 shrink-0 animate-spin text-violet-500"
          aria-hidden
        />
        <p className="text-xs text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex shrink-0 items-center gap-3 border-b border-rose-100 bg-rose-50/70 px-4 py-3 sm:px-5">
        <AlertCircle
          className="size-4 shrink-0 text-rose-500"
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-xs text-rose-700">{t('loadError')}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs text-rose-700 hover:bg-rose-100"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={isFetching ? 'size-3.5 animate-spin' : 'size-3.5'} />
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (!data || data.state === 'NO_ELIGIBLE_CONTEXT') {
    return null;
  }

  const bookingId = data.context?.bookingId;
  const shared = data.state === 'SHARED' ? data.shared : null;
  const isShared = Boolean(shared && data.context);
  const emptyMessage = data.canEdit ? t('notSharedStudent') : t('notSharedTutor');

  const localizedSummary = (() => {
    if (!shared?.answers) return null;
    const parts: string[] = [];
    if (data.context?.subject) {
      parts.push(data.context.subject);
    }
    if (shared.answers.learningGoal) {
      try {
        const optionRoot = subjectOptionNamespace(data.context?.subject ?? '');
        parts.push(tGeneral(`${optionRoot}.goals.${shared.answers.learningGoal}`));
      } catch {
        parts.push(shared.answers.learningGoal.replaceAll('_', ' '));
      }
    }
    if (shared.answers.focusAreas?.length > 0) {
      try {
        const optionRoot = subjectOptionNamespace(data.context?.subject ?? '');
        const focusItems = shared.answers.focusAreas
          .slice(0, 2)
          .map((f) => tGeneral(`${optionRoot}.focus.${f}`))
          .join(', ');
        if (focusItems) parts.push(focusItems);
      } catch {
        // ignore
      }
    }
    return parts.length > 0 ? parts.join(' · ') : shared.shortSummary;
  })();
  const meta = (() => {
    if (!shared?.answers) return [];
    const items: string[] = [];
    const optionRoot = subjectOptionNamespace(data.context?.subject ?? '');
    if (shared.answers.currentLevel) {
      items.push(tGeneral(`${optionRoot}.levels.${shared.answers.currentLevel}`));
    }
    if (shared.answers.lessonsPerMonth) {
      items.push(t('lessonsPerMonth', { count: shared.answers.lessonsPerMonth }));
    }
    for (const focus of shared.answers.focusAreas.slice(0, 2)) {
      items.push(tGeneral(`${optionRoot}.focus.${focus}`));
    }
    return items;
  })();

  return (
    <>
      <section
        data-testid="learning-needs-pin"
        data-pin-state={data.state}
        className="relative z-[2] shrink-0 border-b border-[#e8dcfa] bg-[linear-gradient(110deg,#f6f2ff_0%,#fcfaff_100%)] px-3 py-3.5 sm:px-6 sm:py-4"
        aria-label={t('title')}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-amber-200 bg-amber-50 text-amber-700 sm:size-9">
            <Pin
              className="size-4"
              aria-hidden
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-[#332b7b] sm:text-sm">{t('title')}</p>
                {isShared ? (
                  <span className="rounded bg-[#ebe1fa] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8b6dad]">
                    {t('pinned')}
                  </span>
                ) : null}
              </div>
              {updatedAt ? (
                <p className="hidden shrink-0 text-[10px] text-[#8c7ba1] sm:block">
                  {t('updatedAt', { date: updatedAt })}
                </p>
              ) : null}
            </div>

            {isShared ? (
              <>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6d5c81] sm:text-xs">
                  {localizedSummary ?? shared?.shortSummary}
                </p>
                {meta.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 sm:pr-48">
                    {meta.map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-[#e9e1f4] bg-white px-2 py-1 text-[9px] text-[#7b6990] sm:text-[10px]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-xs leading-5 text-slate-600">{emptyMessage}</p>
            )}
          </div>

          {bookingId && (isShared || data.canEdit) ? (
            <div className="flex shrink-0 flex-col gap-1 self-end sm:absolute sm:right-6 sm:bottom-4 sm:flex-row sm:items-center">
              {isShared ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-violet-200 bg-white px-3 text-[10px] text-[#7024e8] hover:bg-violet-50 sm:text-[11px]"
                  onClick={() => setDialogOpen(true)}
                >
                  <ChevronRight className="size-3" />
                  {t('view')}
                </Button>
              ) : null}
              {data.canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-md px-2 text-[10px] text-slate-500 hover:bg-white/70 sm:text-[11px]"
                  onClick={() => openEditPage(bookingId)}
                >
                  {isShared ? <Pencil className="size-3" /> : null}
                  {isShared ? t('edit') : t('complete')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {bookingId ? (
        <LearningNeedsDialog
          bookingId={bookingId}
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
          initialView="summary"
          onEdit={() => openEditPage(bookingId)}
        />
      ) : null}
    </>
  );
}
