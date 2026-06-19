'use client';

import { Avatar, AvatarFallback, AvatarImage, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { LessonItem } from '@/services';

type MyLessonsEventCardProps = {
  lesson: LessonItem;
  variant?: 'grid' | 'list';
};

const initials = (name?: string) => {
  if (!name?.trim()) return 'T';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'T'
  );
};

export default function MyLessonsEventCard({
  lesson,
  variant = 'grid',
}: MyLessonsEventCardProps) {
  const t = useTranslations('MyLessons.schedule');
  const tGroups = useTranslations('Groups');
  const isPlan = lesson.source === 'subscription';
  const isCompleted = lesson.status === 'completed';
  const hasGroup = Boolean(lesson.groupName);
  const isList = variant === 'list';

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col text-left',
        isList
          ? 'min-h-[72px] gap-2 overflow-hidden rounded-2xl border p-3 shadow-sm'
          : 'h-full min-h-0 justify-center gap-0.5 overflow-hidden rounded-[inherit] border px-1.5 py-1 shadow-sm sm:px-2 sm:py-1.5',
        hasGroup
          ? isList
            ? 'border-indigo-200/80 bg-linear-to-br from-indigo-50 via-white to-cyan-50/90'
            : 'border-indigo-200/80 bg-linear-to-br from-indigo-50/95 via-white to-cyan-50/90'
          : isPlan
            ? isList
              ? 'border-fuchsia-200/80 bg-linear-to-br from-fuchsia-50 via-white to-violet-50/90'
              : 'border-fuchsia-200/80 bg-linear-to-br from-fuchsia-50/95 via-white to-violet-50/90'
            : isList
              ? 'border-amber-200/80 bg-linear-to-br from-amber-50 via-white to-orange-50/70'
              : 'border-amber-200/80 bg-linear-to-br from-amber-50/95 via-white to-orange-50/70',
        isCompleted && 'opacity-[0.88]',
      )}
    >
      <div className={cn('flex shrink-0 flex-wrap items-center gap-1', !isList && 'pt-0.5')}>
        <Badge
          variant="secondary"
          className={cn(
            'max-w-full shrink truncate font-bold uppercase leading-none tracking-wide',
            isList
              ? 'h-5 px-2 py-0 text-[9px]'
              : 'h-4 px-1.5 py-0 text-[8px] sm:h-5 sm:px-2 sm:text-[9px]',
            hasGroup
              ? 'border-indigo-200/60 bg-indigo-100/90 text-indigo-900'
              : isPlan
                ? 'border-fuchsia-200/60 bg-fuchsia-100/90 text-fuchsia-800'
                : 'border-amber-200/60 bg-amber-100/90 text-amber-900',
          )}
        >
          {hasGroup ? tGroups('groupStudyPrefix') : isPlan ? t('lessonTagPlan') : t('lessonTagTrial')}
        </Badge>
        {hasGroup ? (
          <Badge
            variant="outline"
            className={cn(
              'max-w-full shrink truncate font-semibold uppercase leading-none text-indigo-700 border-indigo-200',
              isList
                ? 'h-5 px-2 py-0 text-[9px]'
                : 'h-4 px-1.5 py-0 text-[8px] sm:h-5 sm:px-2 sm:text-[9px]',
            )}
          >
            {lesson.groupName}
          </Badge>
        ) : null}
        {isCompleted ? (
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 font-bold uppercase leading-none text-success border-success',
              isList
                ? 'h-5 px-2 py-0 text-[9px]'
                : 'h-4 px-1.5 py-0 text-[8px] sm:h-5 sm:text-[9px]',
            )}
          >
            {t('completedBadge')}
          </Badge>
        ) : null}
      </div>

      <div className={cn('flex min-h-0 flex-1 items-center overflow-hidden', isList ? 'gap-3' : 'gap-1.5 sm:gap-2')}>
        <Avatar
          className={cn(
            'shrink-0 rounded-md border border-white/80 shadow-sm',
            isList ? 'size-10' : 'size-6 sm:size-7',
          )}
        >
          {lesson.tutorAvatar ? (
            <AvatarImage src={lesson.tutorAvatar} alt={lesson.tutor} className="object-cover" />
          ) : null}
          <AvatarFallback
            className={cn(
              'rounded-md font-bold text-white',
              isList ? 'text-xs' : 'text-[8px] sm:text-[9px]',
              isPlan ? 'bg-linear-to-br from-fuchsia-600 to-violet-600' : 'bg-linear-to-br from-amber-500 to-orange-600',
            )}
          >
            {initials(lesson.tutor)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 leading-tight">
          <p
            className={cn(
              'font-bold leading-snug text-slate-900',
              isList ? 'line-clamp-2 text-sm' : 'line-clamp-2 text-[10px] sm:text-[11px]',
            )}
          >
            {lesson.tutor}
          </p>
          <p
            className={cn(
              'truncate font-semibold tabular-nums text-slate-600',
              isList ? 'text-xs' : 'text-[9px] sm:text-[10px]',
            )}
          >
            {lesson.timeLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
