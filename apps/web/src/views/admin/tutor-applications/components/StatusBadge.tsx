"use client";

import type { VerificationStatus } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  NEW: "bg-violet-100 text-violet-800 border-violet-200",
  WAITLISTED: "bg-slate-100 text-slate-800 border-slate-200",
};

type StatusBadgeProps = {
  status: VerificationStatus | string;
  className?: string;
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations("AdminTutorApplicationDetail.status");
  const cls = STATUS_CLASS[status] ?? STATUS_CLASS.NEW;
  let label = status;
  try {
    label = t(status as never) || status;
  } catch {
    label = status;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
}
