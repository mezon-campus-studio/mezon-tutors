"use client";

import type { TutorResumeItemDto } from "@mezon-tutors/shared";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatYearComplete(year: number | null): string | null {
  if (!year) return null;
  return String(year);
}

export function getResumeSubtitle(item: TutorResumeItemDto): string | null {
  const parts = [item.institution, item.specialization]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((value) => value.trim().toLowerCase() !== item.name.trim().toLowerCase());

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ResumeEntry({
  item,
  verifiedLabel,
  compact = false,
}: {
  item: TutorResumeItemDto;
  verifiedLabel: string;
  compact?: boolean;
}) {
  const yearLabel = formatYearComplete(item.yearOfComplete);
  const subtitle = getResumeSubtitle(item);

  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-1",
        yearLabel ? "grid-cols-[56px_1fr] sm:grid-cols-[70px_1fr]" : "grid-cols-1",
      )}
    >
      {yearLabel ? (
        <p
          className={cn(
            "pt-0.5 font-medium text-gray-500 text-center",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {yearLabel}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <h3
          className={cn(
            "font-bold text-gray-900",
            compact ? "text-sm" : "text-base",
          )}
        >
          {item.name}
        </h3>

        {subtitle ? (
          <p
            className={cn(
              "leading-6 text-gray-500",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {subtitle}
          </p>
        ) : null}

        {item.isVerified ? (
          <div
            className={cn(
              "flex items-center gap-1.5 font-medium text-emerald-600",
              compact ? "text-xs" : "text-sm",
            )}
          >
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>{verifiedLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ResumeEntryList({
  items,
  emptyLabel,
  verifiedLabel,
  compact = false,
}: {
  items: TutorResumeItemDto[];
  emptyLabel: string;
  verifiedLabel: string;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>;
  }

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-8")}>
      {items.map((item) => (
        <ResumeEntry
          key={item.id}
          item={item}
          verifiedLabel={verifiedLabel}
          compact={compact}
        />
      ))}
    </div>
  );
}
