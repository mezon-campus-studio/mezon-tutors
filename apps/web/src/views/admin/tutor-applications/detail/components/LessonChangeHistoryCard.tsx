"use client";

import type { AdminLessonChangeHistoryItem } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useTranslations } from "next-intl";
import { Card, CardContent, Skeleton } from "@/components/ui";
import { useAdminTutorLessonChangeHistory } from "@/services";

dayjs.extend(utc);
dayjs.extend(timezone);

type LessonChangeHistoryCardProps = {
  tutorId: string;
  timezoneName?: string;
};

const formatDateLine = (iso: string, tz: string) => {
  const d = dayjs(iso).tz(tz);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

const formatTimeLine = (iso: string, tz: string) => {
  const d = dayjs(iso).tz(tz);
  return d.isValid() ? d.format("HH:mm") : "—";
};

const formatLessonTimeLine = (
  iso: string,
  durationMinutes: number,
  tz: string,
) => {
  const start = dayjs(iso).tz(tz);
  if (!start.isValid()) return "—";
  return `${start.format("HH:mm")} (${durationMinutes} min)`;
};

const KNOWN_REASON_KEYS = [
  "scheduleConflict",
  "personalEmergency",
  "studentUnavailable",
  "timeNotWork",
  "technicalIssue",
  "avoidBalanceLoss",
  "notMotivated",
  "tutorRescheduledUnavail",
  "tutorAskedCancel",
  "noLongerLearnTutor",
  "other",
] as const;

type KnownReasonKey = (typeof KNOWN_REASON_KEYS)[number];

const isKnownReasonKey = (value: string): value is KnownReasonKey =>
  (KNOWN_REASON_KEYS as readonly string[]).includes(value);

export default function LessonChangeHistoryCard({
  tutorId,
  timezoneName = "UTC",
}: LessonChangeHistoryCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.lessonChangeHistory",
  );
  const tReasons = useTranslations(
    "AdminTutorApplicationDetail.sections.lessonChangeHistory.reasons",
  );
  const { data: items = [], isLoading } = useAdminTutorLessonChangeHistory(tutorId);

  const formatReason = (reason: string) =>
    isKnownReasonKey(reason) ? tReasons(reason) : reason;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="mb-1 text-base font-semibold text-slate-900">
          {t("title")}
        </h3>
        <p className="mb-4 text-sm text-slate-500">{t("subtitle")}</p>

        {isLoading ? (
          <div className="space-y-2">
            {(["r1", "r2", "r3"] as const).map((key) => (
              <Skeleton key={key} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("columns.requestedAt")}</th>
                  <th className="px-4 py-3">{t("columns.student")}</th>
                  <th className="px-4 py-3 min-w-[200px]">{t("columns.lesson")}</th>
                  <th className="px-4 py-3 min-w-[120px]">{t("columns.action")}</th>
                  <th className="w-[18%] min-w-[140px] px-4 py-3">
                    {t("columns.reason")}
                  </th>
                  <th className="w-[32%] min-w-[220px] px-4 py-3">
                    {t("columns.message")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="bg-white align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      <p>{formatDateLine(item.createdAt, timezoneName)}</p>
                      <p className="text-slate-500">
                        {formatTimeLine(item.createdAt, timezoneName)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {item.studentName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-medium text-slate-800">
                        {item.lessonType === "TRIAL"
                          ? t("lessonRef.trial")
                          : t("lessonRef.subscription", {
                              slot: item.subscriptionSlotIndex ?? "—",
                            })}
                      </p>
                      <p className="mt-0.5 text-slate-600">
                        {formatDateLine(item.originalStartAt, timezoneName)}
                      </p>
                      <p className="text-slate-500">
                        {formatLessonTimeLine(
                          item.originalStartAt,
                          item.originalDurationMinutes,
                          timezoneName,
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.action === "CANCEL"
                            ? "inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700"
                            : "inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
                        }
                      >
                        {t(`action.${item.action}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatReason(item.reason)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.message?.trim() ? (
                        <div className="max-h-24 overflow-y-auto pr-1 text-sm leading-relaxed">
                          {item.message}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
