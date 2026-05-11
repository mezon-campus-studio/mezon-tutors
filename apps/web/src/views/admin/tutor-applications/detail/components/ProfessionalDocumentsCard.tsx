"use client";

import type { ProfessionalDocument } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent } from "@/components/ui";
import {
  type UpdateProfessionalDocumentStatusPayload,
  useUpdateProfessionalDocumentStatus,
} from "@/services";
import OnlineFileViewer from "@/components/common/OnlineFileViewer";
import StatusBadge from "../../components/StatusBadge";

type ProfessionalDocumentsCardProps = {
  tutorId: string;
  documents: ProfessionalDocument[];
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

export default function ProfessionalDocumentsCard({
  tutorId,
  documents,
}: ProfessionalDocumentsCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.documents.professionalDocuments",
  );
  const updateMutation = useUpdateProfessionalDocumentStatus(tutorId);

  const handleUpdate = (
    docId: string,
    status: UpdateProfessionalDocumentStatusPayload["status"],
  ) => {
    updateMutation.mutate({ id: docId, payload: { status } });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            {t("title")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">{t("headers.documentName")}</th>
                  <th className="px-4 py-2.5">{t("headers.type")}</th>
                  <th className="px-4 py-2.5">{t("headers.issueDate")}</th>
                  <th className="px-4 py-2.5">{t("headers.status")}</th>
                  <th className="px-4 py-2.5 text-right">
                    {t("headers.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const isPending =
                    doc.status === "PENDING" || doc.status === "NEW";
                  return (
                    <tr key={doc.id} className="bg-white">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {doc.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{doc.type}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <OnlineFileViewer
                            fileUrl={doc.fileKey}
                            fileName={doc.name}
                            label="View online"
                          />
                          {isPending ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleUpdate(doc.id, "APPROVED")}
                                disabled={updateMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                                {t("actions.approve")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() => handleUpdate(doc.id, "REJECTED")}
                                disabled={updateMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                                {t("actions.reject")}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
