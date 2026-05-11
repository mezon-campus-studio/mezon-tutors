"use client";

import type { TutorAvailability, TutorProfile } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";

type AvailabilityCardProps = {
  profile: TutorProfile;
  availability: TutorAvailability[];
};

const groupByDay = (availability: TutorAvailability[]) => {
  const grouped: Record<number, TutorAvailability[]> = {};
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
  const grouped = groupByDay(availability);

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
                        slots.map((slot) => (
                          <span
                            key={slot.id}
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
                {profile.prices?.vnd
                  ? `${profile.prices.vnd.toLocaleString()} VND`
                  : "—"}
                <span className="ml-1 text-sm font-normal text-slate-500">
                  {t("perHour")}
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {t("recommendationPrefix")}
                <span className="font-medium text-slate-700">
                  {profile.prices?.usd ? `${profile.prices.usd} USD` : "—"}
                </span>
                {t("recommendationSuffix")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
