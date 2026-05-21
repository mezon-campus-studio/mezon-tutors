"use client";

import type { TutorAvailability, TutorProfile, WeeklyAvailabilitySlot } from "@mezon-tutors/shared";
import { ECurrency, formatToCurrency, utcWeeklySlotsToTimezone } from "@mezon-tutors/shared";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";

type AvailabilityCardProps = {
  profile: TutorProfile;
  availability: TutorAvailability[];
};

const groupByDay = (availability: WeeklyAvailabilitySlot[]) => {
  const grouped: Record<number, WeeklyAvailabilitySlot[]> = {};
  for (const slot of availability) {
    if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = [];
    grouped[slot.dayOfWeek].push(slot);
  }
  return grouped;
};

export default function AvailabilityCard({
  profile,
  availability,
}: AvailabilityCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.availability",
  );
  const days = useTranslations(
    "AdminTutorApplicationDetail.sections.availability.days",
  );
  const displayAvailability = useMemo(
    () =>
      utcWeeklySlotsToTimezone(
        availability.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
        })),
        profile.timezone ?? "UTC",
      ),
    [availability, profile.timezone],
  );
  const grouped = groupByDay(displayAvailability);
  const { baseCurrency, usd, vnd, php } = profile.prices;
  const primaryAmount =
    baseCurrency === ECurrency.USD
      ? usd
      : baseCurrency === ECurrency.PHP
        ? php
        : vnd;
  const hasRate =
    typeof primaryAmount === "number" &&
    !Number.isNaN(primaryAmount) &&
    primaryAmount > 0;
  const secondaryParts: string[] = [];
  if (baseCurrency !== ECurrency.VND && vnd > 0) {
    secondaryParts.push(formatToCurrency(ECurrency.VND, vnd));
  }
  if (baseCurrency !== ECurrency.USD && usd > 0) {
    secondaryParts.push(formatToCurrency(ECurrency.USD, usd));
  }
  if (baseCurrency !== ECurrency.PHP && php > 0) {
    secondaryParts.push(formatToCurrency(ECurrency.PHP, php));
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          {t("title")}
        </h3>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">
              {t("weeklySchedule")}
            </p>
            <div className="space-y-2">
              {([0, 1, 2, 3, 4, 5, 6] as const).map((idx) => {
                const slots = grouped[idx] ?? [];
                return (
                  <div
                    key={`day-${idx}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="w-24 shrink-0 text-sm font-medium text-slate-700">
                      {days(String(idx) as never)}
                    </span>
                    <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                      {slots.length === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        slots.map((slot, slotIndex) => (
                          <span
                            key={`${idx}-${slot.startTime}-${slot.endTime}-${slotIndex}`}
                            className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                          >
                            {slot.startTime} - {slot.endTime}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">
              {t("requestedRate")}
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-3xl font-bold text-slate-900">
                {hasRate ? (
                  <>
                    {formatToCurrency(baseCurrency, primaryAmount)}
                    <span className="ml-1 text-sm font-normal text-slate-500">
                      {t("perHour")}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </p>
              {secondaryParts.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  {t("recommendationPrefix")}
                  <span className="font-medium text-slate-700">
                    {secondaryParts.join(" · ")}
                  </span>
                  {t("recommendationSuffix")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
