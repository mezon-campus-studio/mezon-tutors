"use client";

import type { IdentityVerification } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { Check, Download, FileImage, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Label,
} from "@/components/ui";
import {
  type UpdateIdentityVerificationStatusPayload,
  useUpdateIdentityVerificationStatus,
} from "@/services";
import StatusBadge from "../../components/StatusBadge";

type IdentityVerificationCardProps = {
  tutorId: string;
  verification: IdentityVerification | null;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

export default function IdentityVerificationCard({
  tutorId,
  verification,
}: IdentityVerificationCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.documents.identityVerification",
  );
  const updateMutation = useUpdateIdentityVerificationStatus(tutorId);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [checks, setChecks] = useState({
    nameMatch: verification?.nameMatch ?? false,
    notExpired: verification?.notExpired ?? false,
    photoClarity: verification?.photoClarity ?? false,
  });

  if (!verification) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h3 className="mb-2 text-base font-semibold text-slate-900">
            {t("title")}
          </h3>
          <p className="text-sm text-slate-500">{t("noDocument")}</p>
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = (
    status: UpdateIdentityVerificationStatusPayload["status"],
  ) => {
    updateMutation.mutate({
      id: verification.id,
      payload: {
        status,
        nameMatch: checks.nameMatch,
        notExpired: checks.notExpired,
        photoClarity: checks.photoClarity,
      },
    });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t("title")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
          </div>
          <StatusBadge status={verification.status} />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              aria-label="View full document"
              onClick={() => setIsPreviewOpen(true)}
              className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition hover:border-slate-300"
            >
              {verification.fileKey ? (
                <img
                  src={verification.fileKey}
                  alt={t("idPreviewPlaceholder")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <FileImage className="h-8 w-8" />
                  <span className="text-xs">{t("idPreviewPlaceholder")}</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20 opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                  View larger
                </span>
              </div>
            </button>
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-5xl w-full p-0 bg-black">
                <DialogTitle className="sr-only">{t("idPreviewPlaceholder")}</DialogTitle>
                {verification.fileKey ? (
                  <img
                    src={verification.fileKey}
                    alt={t("idPreviewPlaceholder")}
                    className="h-[min(80vh,calc(100vw-2rem))] w-full object-contain bg-black"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center bg-slate-900 text-white">
                    {t("idPreviewPlaceholder")}
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{t("idTypeLabel")}</span>
              <span>
                {t("uploadedAt", { date: formatDate(verification.uploadedAt) })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-900">
                {t("checklist.title")}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nameMatch"
                    checked={checks.nameMatch}
                    onCheckedChange={(v) =>
                      setChecks((s) => ({ ...s, nameMatch: !!v }))
                    }
                  />
                  <Label htmlFor="nameMatch" className="text-sm">
                    {t("checklist.nameMatchesProfile")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notExpired"
                    checked={checks.notExpired}
                    onCheckedChange={(v) =>
                      setChecks((s) => ({ ...s, notExpired: !!v }))
                    }
                  />
                  <Label htmlFor="notExpired" className="text-sm">
                    {t("checklist.documentNotExpired")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="photoClarity"
                    checked={checks.photoClarity}
                    onCheckedChange={(v) =>
                      setChecks((s) => ({ ...s, photoClarity: !!v }))
                    }
                  />
                  <Label htmlFor="photoClarity" className="text-sm">
                    {t("checklist.photoClarity")}
                  </Label>
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleUpdate("APPROVED")}
                disabled={updateMutation.isPending}
              >
                <Check className="h-4 w-4" />
                {t("approve")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => handleUpdate("REJECTED")}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4" />
                {t("reject")}
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
                {t("download")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
