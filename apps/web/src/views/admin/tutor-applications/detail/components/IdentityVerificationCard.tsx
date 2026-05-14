"use client";

import type { IdentityVerification } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import StatusBadge from "../../components/StatusBadge";

type IdentityVerificationCardProps = {
  verification: IdentityVerification | null;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

const isLikelyHttp = (s: string) => /^https?:\/\//i.test(s.trim());

const isLikelyRasterImage = (s: string) => {
  const base = s.split("?")[0] ?? s;
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(base);
};

export default function IdentityVerificationCard({
  verification,
}: IdentityVerificationCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.documents.identityVerification",
  );
  const fileKey = verification?.fileKey?.trim() ?? "";

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-slate-900">{t("title")}</h3>
        <p className="mt-1 text-xs text-slate-500">{t("subtitle")}</p>

        {!fileKey ? (
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
            {isLikelyHttp(fileKey) && isLikelyRasterImage(fileKey) ? (
              <a
                href={fileKey}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                <img
                  src={fileKey}
                  alt={t("idTypeLabel")}
                  className="max-h-[320px] w-full object-contain"
                />
              </a>
            ) : null}
            <a
              href={fileKey}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex w-fit no-underline",
              )}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("download")}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
