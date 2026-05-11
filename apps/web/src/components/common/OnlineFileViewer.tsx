"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"]);
const OFFICE_EXTENSIONS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
const TEXT_EXTENSIONS = new Set(["txt", "csv", "md"]);

function getFileName(fileUrl: string, fallback = "Document") {
  try {
    const lastSegment = fileUrl.split("/").pop() ?? "";
    return decodeURIComponent(lastSegment.split("?")[0] || fallback) || fallback;
  } catch {
    return fallback;
  }
}

function getFileExtension(fileUrl: string) {
  const match = fileUrl.match(/\.([^.?#]+)(?:[?#]|$)/);
  return match?.[1]?.toLowerCase() ?? "";
}

function getPreviewUrl(fileUrl: string, extension: string) {
  if (OFFICE_EXTENSIONS.has(extension)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  }

  if (extension === "pdf" || TEXT_EXTENSIONS.has(extension) || IMAGE_EXTENSIONS.has(extension)) {
    return fileUrl;
  }

  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

type OnlineFileViewerProps = {
  fileUrl: string;
  fileName?: string;
  label?: string;
  className?: string;
};

export default function OnlineFileViewer({
  fileUrl,
  fileName,
  label = "View online",
  className,
}: OnlineFileViewerProps) {
  const [open, setOpen] = useState(false);

  const extension = useMemo(() => getFileExtension(fileUrl), [fileUrl]);
  const title = useMemo(() => fileName || getFileName(fileUrl), [fileName, fileUrl]);
  const previewUrl = useMemo(() => getPreviewUrl(fileUrl, extension), [fileUrl, extension]);
  const isImage = IMAGE_EXTENSIONS.has(extension);
  const isPdf = extension === "pdf";
  const isOffice = OFFICE_EXTENSIONS.has(extension);
  const isText = TEXT_EXTENSIONS.has(extension);
  const canPreviewInline = isImage || isPdf || isOffice || isText;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={className}
        type="button"
        onClick={() => setOpen(true)}
      >
        <ExternalLink className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-full p-0 bg-slate-950">
          <DialogHeader className="border-b border-slate-800 bg-slate-900 px-5 py-4">
            <DialogTitle className="text-sm font-semibold text-white">{title}</DialogTitle>
          </DialogHeader>

          <div className="min-h-[55vh] bg-slate-950 text-white">
            {canPreviewInline ? (
              isImage ? (
                <img
                  src={previewUrl}
                  alt={title}
                  className="h-[min(80vh,calc(100vw-2rem))] w-full object-contain bg-black"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={title}
                  className="h-[min(80vh,calc(100vw-2rem))] w-full border-0 bg-white"
                />
              )
            ) : (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-10 text-center text-sm text-slate-200 sm:px-10">
                <FileText className="h-10 w-10 text-slate-400" />
                <p className="max-w-xl">
                  This file cannot be previewed directly in the browser. Open it in a new tab to view it.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}
                >
                  Open in new tab
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="justify-end gap-2 bg-slate-900 px-5 py-4">
            <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}>Open raw</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
