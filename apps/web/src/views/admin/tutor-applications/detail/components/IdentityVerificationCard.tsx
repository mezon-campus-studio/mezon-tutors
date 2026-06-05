"use client";

import type { IdentityVerification } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAtomValue } from "jotai";
import { Card, CardContent } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import SecureImage from "@/components/ui/SecureImage";
import { cn } from "@/lib/utils";
import { openSecureProxyInNewTab } from "@/lib/open-secure-proxy-in-new-tab";
import { accessTokenAtom } from "@/store/token.atom";
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
  const token = useAtomValue(accessTokenAtom);
  const hasDocument = verification?.hasFile ?? false;
  const proxyPath = `/admin/tutor-profiles/${tutorId}/identity-verification/image`;

  const handleOpenInNewTab = () => {
    void openSecureProxyInNewTab(proxyPath, token);
  };

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
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex w-fit",
              )}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("download")}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
