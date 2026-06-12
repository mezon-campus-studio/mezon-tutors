"use client";

import { CalendarDays, Clock, Shield, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type TrialLessonDetailsCardProps = {
  tutorName: string;
  tutorSubtitle: string;
  avatarUrl: string;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
};

export function TrialLessonDetailsCard({
  tutorName,
  tutorSubtitle,
  avatarUrl,
  dateLabel,
  timeLabel,
  durationLabel,
}: TrialLessonDetailsCardProps) {
  const t = useTranslations("TrialLessonCheckout.TrialLessonDetailsCard");

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                width={72}
                height={72}
                alt={tutorName}
                className="size-16 rounded-2xl object-cover ring-2 ring-white shadow-sm shadow-violet-200/40 sm:size-20"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-xl font-extrabold text-violet-700 sm:size-20">
                {tutorName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">
              <Sparkles className="size-3" />
              {t("trialLesson")}
            </p>
            <p className="mt-0.5 truncate text-lg font-extrabold text-slate-900 sm:text-xl">
              {tutorName}
            </p>
            <p className="line-clamp-2 text-xs text-slate-500 sm:text-sm">
              {tutorSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-violet-100/70 sm:grid-cols-3">
        <DetailCell
          icon={CalendarDays}
          label={t("date")}
          value={dateLabel}
          accent="from-violet-500 to-purple-500"
        />
        <DetailCell
          icon={Clock}
          label={t("time")}
          value={timeLabel}
          accent="from-purple-500 to-fuchsia-500"
        />
        <DetailCell
          icon={Sparkles}
          label={t("duration")}
          value={durationLabel}
          accent="from-fuchsia-500 to-rose-500"
        />
      </div>
    </div>
  );
}

function DetailCell({
  icon: Icon,
  label,
  value,
  accent,
  highlight,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2">
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}
        >
          <Icon className="size-3.5" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
      </div>
      <p
        className={`mt-2 text-sm font-extrabold leading-snug ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
