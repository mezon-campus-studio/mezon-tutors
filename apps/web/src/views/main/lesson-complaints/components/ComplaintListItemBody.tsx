"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

type ComplaintListItemBodyProps = {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusIcon: React.ComponentType<{ className?: string }>;
  statusVariant?: "default" | "secondary" | "destructive" | "outline";
  badgeClassName: string;
  statusIconClassName?: string;
  panelClassName?: string;
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
  statusVariant = "secondary",
  badgeClassName,
  statusIconClassName,
  panelClassName,
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
      className={cn(
        "h-auto w-fit max-w-full shrink-0 rounded-full border-0 px-2.5 py-1 text-xs font-semibold ring-1 sm:px-3 sm:py-1.5 sm:text-sm",
        badgeClassName,
      )}
    >
      <StatusIcon
        className={cn("mr-1.5 size-3.5 shrink-0 sm:mr-2 sm:size-4", statusIconClassName)}
      />
      <span className="text-left leading-snug">{statusLabel}</span>
    </Badge>
  );

  return (
    <div
      className={cn(
        "rounded-xl border p-3 shadow-sm sm:p-4 lg:p-5",
        panelClassName ?? "border-white/60 bg-white/70 shadow-slate-200/30",
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,11rem)_1fr_auto] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,13rem)_1fr_auto] xl:gap-6">
        <div className="min-w-0 space-y-3 lg:pr-2">
          <div className="min-w-0 space-y-2">
            <div className="min-w-0 space-y-1">
              <p className="text-base font-bold text-slate-900 sm:text-lg">{title}</p>
              <p className="text-sm font-medium text-violet-700">{subtitle}</p>
            </div>
            <div className="lg:hidden">{badge}</div>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4 lg:grid-cols-1">
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-slate-500 sm:text-sm">
                {lessonTimeLabel}
              </dt>
              <dd className="mt-1 wrap-break-word font-medium text-slate-800">
                {lessonTimeValue}
                {lessonTimeExtra ? (
                  <span className="ml-1 font-normal text-slate-500">{lessonTimeExtra}</span>
                ) : null}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-slate-500 sm:text-sm">
                {submittedLabel}
              </dt>
              <dd className="mt-1 wrap-break-word font-medium text-slate-800">
                {submittedValue}
              </dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:px-5 lg:pt-0">
          <p className="text-sm font-semibold text-slate-700">{reasonLabel}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-800 lg:text-base">{reason}</p>
          {message ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
          ) : null}
          {attachments ? <div className="mt-4 min-w-0">{attachments}</div> : null}
        </div>

        <div className="hidden lg:flex lg:justify-end lg:pl-2">{badge}</div>
      </div>
    </div>
  );
}
