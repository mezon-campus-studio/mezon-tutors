'use client';

import { Avatar, AvatarFallback, AvatarImage, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { LessonItem } from '@/services';

type MyLessonsEventCardProps = {
  lesson: LessonItem;
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

export default function MyLessonsEventCard({ lesson }: MyLessonsEventCardProps) {
  const t = useTranslations('MyLessons.schedule');
  const isPlan = lesson.source === 'subscription';
  const isCompleted = lesson.status === 'completed';

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-col justify-center gap-0.5 overflow-hidden rounded-[inherit] border px-1.5 py-1 text-left shadow-sm sm:px-2 sm:py-1.5',
        isPlan
          ? 'border-fuchsia-200/80 bg-linear-to-br from-fuchsia-50/95 via-white to-violet-50/90'
          : 'border-amber-200/80 bg-linear-to-br from-amber-50/95 via-white to-orange-50/70',
        isCompleted && 'opacity-[0.88]',
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1 pt-0.5">
        <Badge
          variant="secondary"
          className={cn(
            'h-4 max-w-full shrink truncate px-1.5 py-0 text-[8px] font-bold uppercase leading-none tracking-wide sm:h-5 sm:px-2 sm:text-[9px]',
            isPlan
              ? 'border-fuchsia-200/60 bg-fuchsia-100/90 text-fuchsia-800'
              : 'border-amber-200/60 bg-amber-100/90 text-amber-900',
          )}
        >
          {isPlan ? t('lessonTagPlan') : t('lessonTagTrial')}
        </Badge>
        {isCompleted ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 px-1.5 py-0 text-[8px] font-bold uppercase leading-none text-slate-600 sm:h-5 sm:text-[9px]"
          >
            {t('completedBadge')}
          </Badge>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-1.5 overflow-hidden sm:gap-2">
        <Avatar className="size-6 shrink-0 rounded-md border border-white/80 shadow-sm sm:size-7">
          {lesson.tutorAvatar ? (
            <AvatarImage src={lesson.tutorAvatar} alt={lesson.tutor} className="object-cover" />
          ) : null}
          <AvatarFallback
            className={cn(
              'rounded-md text-[8px] font-bold text-white sm:text-[9px]',
              isPlan ? 'bg-linear-to-br from-fuchsia-600 to-violet-600' : 'bg-linear-to-br from-amber-500 to-orange-600',
            )}
          >
            {initials(lesson.tutor)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-px leading-tight">
          <p className="line-clamp-2 text-[10px] font-bold leading-snug text-slate-900 sm:text-[11px]">{lesson.subject}</p>
          <p className="truncate text-[9px] font-semibold text-slate-700 sm:text-[10px]">{lesson.tutor}</p>
          <p className="truncate text-[9px] font-semibold tabular-nums text-slate-600 sm:text-[10px]">{lesson.timeLabel}</p>
        </div>
      </div>
    </div>
  );
}
