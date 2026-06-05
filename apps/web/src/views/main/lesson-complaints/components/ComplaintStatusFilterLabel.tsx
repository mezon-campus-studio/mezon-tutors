'use client';

import type { LessonComplaintStatusFilter } from '@mezon-tutors/shared';

const FILTER_STATUS_STYLES: Record<
  LessonComplaintStatusFilter,
  { dotClass: string; textClass: string }
> = {
  all: { dotClass: 'bg-violet-400', textClass: 'text-slate-700' },
  PENDING: { dotClass: 'bg-sky-400', textClass: 'text-sky-700' },
  TUTOR_REVIEW_REQUESTED: { dotClass: 'bg-amber-400', textClass: 'text-amber-700' },
  TUTOR_CONFIRMED: { dotClass: 'bg-violet-400', textClass: 'text-violet-700' },
  TUTOR_REJECTED: { dotClass: 'bg-rose-400', textClass: 'text-rose-700' },
  APPROVED: { dotClass: 'bg-emerald-400', textClass: 'text-emerald-700' },
  REJECTED: { dotClass: 'bg-rose-400', textClass: 'text-rose-700' },
};

type ComplaintStatusFilterLabelProps = {
  filterKey: LessonComplaintStatusFilter;
  label: string;
};

export function ComplaintStatusFilterLabel({
  filterKey,
  label,
}: ComplaintStatusFilterLabelProps) {
  const style = FILTER_STATUS_STYLES[filterKey];

  return (
    <span className={`flex items-center gap-2 ${style.textClass}`}>
      <span className={`size-2 shrink-0 rounded-full ${style.dotClass}`} />
      <span>{label}</span>
    </span>
  );
}
