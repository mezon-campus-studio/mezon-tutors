"use client";

import type { TutorProfile } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";
import StatusBadge from "../../components/StatusBadge";

type ApplicationMetaCardProps = {
  profile: TutorProfile;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY HH:mm") : "—";
};

export default function ApplicationMetaCard({
  profile,
}: ApplicationMetaCardProps) {
  const t = useTranslations("AdminTutorApplicationDetail.sidebar.meta");

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          {t("title")}
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">ID</dt>
            <dd className="font-mono text-xs text-slate-700">
              {profile.id.slice(0, 8)}…
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={profile.verificationStatus} />
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Submitted</dt>
            <dd className="text-slate-700">{formatDate(profile.createdAt)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Last Updated</dt>
            <dd className="text-slate-700">{formatDate(profile.updatedAt)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{t("timezone")}</dt>
            <dd className="text-slate-700">{profile.timezone || "—"}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
