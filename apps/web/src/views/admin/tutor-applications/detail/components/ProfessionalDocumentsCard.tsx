"use client";

import type { ProfessionalDocument } from "@mezon-tutors/shared";
import { isDialogPreviewableFormat } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui";
import { accessTokenAtom } from "@/store/token.atom";
import StatusBadge from "../../components/StatusBadge";
import SecureDocumentPreviewDialog from "./SecureDocumentPreviewDialog";

type ProfessionalDocumentsCardProps = {
  documents: ProfessionalDocument[];
  tutorId: string;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

function canPreviewDocument(doc: ProfessionalDocument): boolean {
  if (!doc.hasFile) return false;
  if (doc.fileFormat) {
    return isDialogPreviewableFormat(doc.fileFormat);
  }
  const ext = doc.fileName?.split(".").pop();
  return ext ? isDialogPreviewableFormat(ext) : false;
}

function ViewDocumentButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.documents.professionalDocuments",
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1 text-violet-600 hover:underline"
    >
      <Eye className="h-3.5 w-3.5" />
      {t("viewFile")}
    </button>
  );
}

export default function ProfessionalDocumentsCard({
  documents,
  tutorId,
}: ProfessionalDocumentsCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.documents.professionalDocuments",
  );
  const token = useAtomValue(accessTokenAtom);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<ProfessionalDocument | null>(
    null,
  );

  const handleView = (doc: ProfessionalDocument) => {
    setPreviewTarget(doc);
    setPreviewOpen(true);
  };

  const previewViewLinkPath = previewTarget
    ? `/admin/tutor-profiles/${tutorId}/documents/${previewTarget.id}/view-link`
    : "";
  const previewProxyPath = previewTarget
    ? `/admin/tutor-profiles/${tutorId}/documents/${previewTarget.id}/image`
    : "";

  return (
    <>
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h3 className="text-base font-semibold text-slate-900">{t("title")}</h3>
          <p className="mt-1 text-xs text-slate-500">{t("subtitle")}</p>

          {documents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">{t("empty")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3">{t("headers.documentName")}</th>
                    <th className="pb-2 pr-3">{t("headers.type")}</th>
                    <th className="pb-2 pr-3">{t("headers.status")}</th>
                    <th className="pb-2 pr-3">{t("headers.uploadedAt")}</th>
                    <th className="pb-2">{t("headers.file")}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-3 pr-3 font-medium text-slate-900">
                        {doc.name}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{doc.type}</td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="py-3">
                        {canPreviewDocument(doc) ? (
                          <ViewDocumentButton onClick={() => handleView(doc)} />
                        ) : (
                          "—"
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

      {previewTarget ? (
        <SecureDocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={previewTarget.name}
          viewLinkPath={previewViewLinkPath}
          proxyPath={previewProxyPath}
          token={token}
        />
      ) : null}
    </>
  );
}
