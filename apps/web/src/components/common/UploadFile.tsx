"use client";

import { FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

export type UploadFileVariant = 'image' | 'file';

export type UploadFileProps = {
  accept: string;
  previewUrl?: string | null;
  fileName?: string | null;
  isUploading?: boolean;
  onFile: (file: File) => void | Promise<void>;
  uploadLabel?: string;
  uploadingLabel?: string;
  hint?: string;
  emptyLabel?: string;
  dropHereLabel?: string;
  className?: string;
  error?: string;
  variant?: UploadFileVariant;
};

function UploadActionButton({
  isUploading,
  uploadingLabel,
  uploadLabel,
  compact = false,
}: {
  isUploading: boolean;
  uploadingLabel: string;
  uploadLabel: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-brand-gradient font-semibold text-white shadow-md shadow-violet-300/40',
        compact ? 'mt-1 h-8 px-4 text-[11px]' : 'mt-2 h-9 px-5 text-xs',
      )}
    >
      {isUploading ? (
        <Spinner className={cn('mr-1.5 text-white', compact ? 'size-3.5' : 'size-4')} />
      ) : (
        <Upload className={cn('mr-1.5', compact ? 'size-3.5' : 'size-4')} />
      )}
      {isUploading ? uploadingLabel : uploadLabel}
    </span>
  );
}

export default function UploadFile({
  accept,
  previewUrl,
  fileName,
  isUploading = false,
  onFile,
  uploadLabel = 'Upload file',
  uploadingLabel = 'Uploading…',
  hint,
  emptyLabel = 'Click or drag and drop',
  dropHereLabel = 'Drop here',
  className,
  error,
  variant = 'file',
}: UploadFileProps) {
  const inputId = useId();
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const openFilePicker = () => {
    if (isUploading) return;
    document.getElementById(inputId)?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const isImage = variant === 'image';
  const hasContent = isImage
    ? !!previewUrl
    : !!(fileName?.trim() || previewUrl);

  return (
    <div className={cn('flex w-full flex-col items-center gap-2', className)}>
      <div
        role="button"
        tabIndex={isUploading ? -1 : 0}
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (isUploading) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-busy={isUploading}
        className={cn(
          'relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed bg-[linear-gradient(135deg,#faf7ff,#ffffff)] transition-colors',
          isImage ? 'aspect-16/10 max-w-2xl' : 'flex flex-col items-center justify-center gap-2 p-6',
          isDragOver
            ? 'border-violet-400 bg-violet-50/80 ring-2 ring-violet-200/60'
            : 'border-violet-100 hover:border-violet-200 hover:bg-violet-50/40',
          isUploading && 'pointer-events-none cursor-wait',
        )}
      >
        {isImage ? (
          previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="pointer-events-none h-full w-full object-cover"
            />
          ) : (
            <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-600">
                <ImageIcon className="size-6" />
              </div>
              <p className="text-xs text-slate-600 sm:text-sm">
                {isDragOver ? dropHereLabel : emptyLabel}
              </p>
              {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
              <UploadActionButton
                isUploading={isUploading}
                uploadingLabel={uploadingLabel}
                uploadLabel={uploadLabel}
              />
            </div>
          )
        ) : hasContent ? (
          <div className="pointer-events-none flex flex-col items-center gap-2 px-2 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
              <FileText className="size-5" />
            </div>
            <p className="max-w-full truncate text-sm font-semibold text-slate-900">
              {isDragOver ? dropHereLabel : fileName}
            </p>
            <UploadActionButton
              isUploading={isUploading}
              uploadingLabel={uploadingLabel}
              uploadLabel={uploadLabel}
              compact
            />
          </div>
        ) : (
          <div className="pointer-events-none flex flex-col items-center gap-2 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
              <Upload className="size-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {isDragOver ? dropHereLabel : emptyLabel}
            </p>
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
            <UploadActionButton
              isUploading={isUploading}
              uploadingLabel={uploadingLabel}
              uploadLabel={uploadLabel}
            />
          </div>
        )}

        {isUploading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/80 backdrop-blur-[2px]">
            <Spinner className={cn(isImage ? 'size-10' : 'size-8', 'text-violet-600')} />
            <p className="text-xs font-semibold text-violet-800">{uploadingLabel}</p>
          </div>
        ) : null}

        {!isUploading && isDragOver && isImage && previewUrl ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-violet-500/10">
            <p className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-violet-800 shadow-sm">
              {dropHereLabel}
            </p>
          </div>
        ) : null}
      </div>

      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {error ? <p className="text-center text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
