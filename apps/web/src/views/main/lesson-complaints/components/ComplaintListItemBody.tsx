"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

type ComplaintListItemBodyProps = {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusIcon: React.ComponentType<{ className?: string }>;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
  badgeClassName: string;
  lessonTimeLabel: string;
  lessonTimeValue: string;
  lessonTimeExtra?: string;
  submittedLabel: string;
  submittedValue: string;
  reasonLabel: string;
  reason: string;
  message?: string | null;
  attachments?: ReactNode;
};

export function ComplaintListItemBody({
  title,
  subtitle,
  statusLabel,
  statusIcon: StatusIcon,
  statusVariant,
  badgeClassName,
  lessonTimeLabel,
  lessonTimeValue,
  lessonTimeExtra,
  submittedLabel,
  submittedValue,
  reasonLabel,
  reason,
  message,
  attachments,
}: ComplaintListItemBodyProps) {
  const badge = (
    <Badge
      variant={statusVariant}
      className={cn("h-auto w-fit shrink-0 px-3 py-1.5 text-sm font-semibold", badgeClassName)}
    >
      <StatusIcon className="mr-2 size-4" />
      {statusLabel}
    </Badge>
  );

  return (
    <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm shadow-slate-200/30 md:p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,11rem)_1fr_auto] md:items-start md:gap-5 lg:grid-cols-[minmax(0,13rem)_1fr_auto] lg:gap-6">
        <div className="min-w-0 space-y-3 md:pr-2">
          <div className="flex items-start justify-between gap-3 md:block">
            <div className="min-w-0 space-y-1">
              <p className="text-base font-bold text-slate-900 md:text-lg">{title}</p>
              <p className="text-sm font-medium text-violet-700">{subtitle}</p>
            </div>
            <div className="md:hidden">{badge}</div>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">{lessonTimeLabel}</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {lessonTimeValue}
                {lessonTimeExtra ? (
                  <span className="ml-1 font-normal text-slate-500">{lessonTimeExtra}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">{submittedLabel}</dt>
              <dd className="mt-1 font-medium text-slate-800">{submittedValue}</dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0 md:border-l md:border-slate-100 md:px-5">
          <p className="text-sm font-semibold text-slate-700">{reasonLabel}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-800 md:text-base">{reason}</p>
          {message ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
          ) : null}
          {attachments ? <div className="mt-4">{attachments}</div> : null}
        </div>

        <div className="hidden md:flex md:justify-end md:pl-2">{badge}</div>
      </div>
    </div>
  );
}
