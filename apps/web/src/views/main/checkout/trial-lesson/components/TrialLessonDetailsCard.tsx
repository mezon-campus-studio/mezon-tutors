"use client";

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
    <div className="overflow-hidden rounded-[20px] border border-primary bg-card">
      <div className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
        <div className="flex-1 space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-primary">{t("trialLesson")}</p>
          <p className="text-xl font-bold text-foreground">{tutorName}</p>
          <p className="text-muted-foreground">{tutorSubtitle}</p>
        </div>

        <div className="flex h-[100px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-muted md:w-[170px]">
          {avatarUrl ? (
            <Image src={avatarUrl} width={170} height={100} className="h-full w-full object-cover" alt="" />
          ) : (
            <p className="text-xs text-muted-foreground">...</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 border-t p-4">
        <div className="space-y-4">
          <div className="min-w-[110px] space-y-1">
            <p className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground">{t("date")}</p>
            <p className="font-bold text-foreground">{dateLabel}</p>
          </div>
          <div className="min-w-[110px] space-y-1">
            <p className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground">{t("time")}</p>
            <p className="font-bold text-foreground">{timeLabel}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="min-w-[110px] space-y-1">
            <p className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground">{t("duration")}</p>
            <p className="font-bold text-foreground">{durationLabel}</p>
          </div>
          <div className="min-w-[110px] space-y-1">
            <p className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground">{t("policy")}</p>
            <p className="font-bold text-primary">{t("freeCancellation")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
