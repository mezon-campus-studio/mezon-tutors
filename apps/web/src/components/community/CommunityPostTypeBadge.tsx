'use client';

import type { CommunityPostType } from '@mezon-tutors/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

const TYPE_STYLES: Record<CommunityPostType, string> = {
  POST: 'bg-violet-50 text-violet-700 ring-violet-100',
  QUESTION: 'bg-sky-50 text-sky-700 ring-sky-100',
  EXERCISE: 'bg-amber-50 text-amber-700 ring-amber-100',
};

type CommunityPostTypeBadgeProps = {
  type: CommunityPostType;
  className?: string;
};

export function CommunityPostTypeBadge({ type, className }: CommunityPostTypeBadgeProps) {
  const t = useTranslations('Community.postTypes');
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border-0 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1',
        TYPE_STYLES[type],
        className,
      )}
    >
      {t(type)}
    </Badge>
  );
}
