"use client";

import type { IdentityVerification } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";
import SecureImage from "@/components/ui/SecureImage";
import StatusBadge from "../../components/StatusBadge";

type IdentityVerificationCardProps = {
  verification: IdentityVerification | null;
  tutorId: string;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

export default function IdentityVerificationCard({
  verification,
  tutorId,
}: IdentityVerificationCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.documents.identityVerification",
  );
  const hasDocument = verification?.hasFile ?? false;
  const proxyPath = `/admin/tutor-profiles/${tutorId}/identity-verification/image`;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-slate-900">{t("title")}</h3>
        <p className="mt-1 text-xs text-slate-500">{t("subtitle")}</p>

        {!hasDocument ? (
          <p className="mt-4 text-sm text-slate-600">{t("noDocument")}</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {verification ? <StatusBadge status={verification.status} /> : null}
              <span className="text-xs text-slate-500">
                {t("uploadedAt", {
                  date: formatDate(verification?.uploadedAt),
                })}
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("idTypeLabel")}
            </p>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <SecureImage
                proxyPath={proxyPath}
                alt={t("idTypeLabel")}
                className="max-h-[320px] w-full object-contain"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
