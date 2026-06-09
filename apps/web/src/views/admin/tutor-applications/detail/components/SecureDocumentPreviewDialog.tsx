"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
} from "@/components/ui";
import {
  loadAdminSecureDocumentPreview,
  type AdminDocumentPreview,
} from "@/lib/admin-secure-document-preview";
import { renderDocxPreviewResponsive } from "@/lib/render-docx-preview";

type SecureDocumentPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  viewLinkPath: string;
  proxyPath: string;
  token: string | null;
};

export default function SecureDocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  viewLinkPath,
  proxyPath,
  token,
}: SecureDocumentPreviewDialogProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.documents.professionalDocuments",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState<AdminDocumentPreview | null>(null);
  const revokeRef = useRef<(() => void) | null>(null);
  const docxCleanupRef = useRef<(() => void) | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      revokeRef.current?.();
      revokeRef.current = null;
      docxCleanupRef.current?.();
      docxCleanupRef.current = null;
      setPreview(null);
      setError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setPreview(null);

    void loadAdminSecureDocumentPreview(viewLinkPath, proxyPath, token).then(
      (result) => {
        if (cancelled) {
          result?.revoke?.();
          return;
        }
        if (!result) {
          setError(true);
          setLoading(false);
          return;
        }
        revokeRef.current = result.revoke ?? null;
        setPreview(result);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [open, viewLinkPath, proxyPath, token]);

  useEffect(() => {
    if (!preview || preview.previewKind !== "docx" || !preview.docxBuffer) {
      return;
    }

    const container = docxContainerRef.current;
    if (!container) return;

    let cancelled = false;
    docxCleanupRef.current?.();
    docxCleanupRef.current = null;

    void renderDocxPreviewResponsive(preview.docxBuffer, container)
      .then((cleanup) => {
        if (cancelled) {
          cleanup();
          return;
        }
        docxCleanupRef.current = cleanup;
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      docxCleanupRef.current?.();
      docxCleanupRef.current = null;
    };
  }, [preview]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      revokeRef.current?.();
      revokeRef.current = null;
      docxCleanupRef.current?.();
      docxCleanupRef.current = null;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[85vh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-full max-sm:rounded-none sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <DialogTitle className="truncate pr-8">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative min-h-0 min-w-0 flex-1 bg-slate-50">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-600">
              <Spinner className="h-5 w-5" />
              {t("viewFileLoading")}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">
              {t("previewError")}
            </div>
          ) : null}

          {!loading && !error && preview?.previewKind === "image" && preview.previewUrl ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.previewUrl}
                alt={preview.fileName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : null}

          {!loading && !error && preview?.previewKind === "iframe" && preview.previewUrl ? (
            <iframe
              title={preview.fileName}
              src={preview.previewUrl}
              className="h-full w-full border-0 bg-white"
            />
          ) : null}

          {!loading && !error && preview?.previewKind === "docx" ? (
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div
                ref={docxContainerRef}
                className="docx-preview-container min-w-0 bg-white px-2 py-3 sm:px-4 sm:py-4"
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
