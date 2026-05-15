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
  const hasContent = isImage ? !!previewUrl : !!fileName;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
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
          isImage ? 'aspect-16/10 max-w-2xl' : 'flex flex-col items-center gap-2 p-6',
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
            <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-600">
                <ImageIcon className="size-6" />
              </div>
              <p className="px-4 text-center text-xs sm:text-sm">
                {isDragOver ? dropHereLabel : emptyLabel}
              </p>
            </div>
          )
        ) : (
          <>
            <div className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
              {hasContent ? <FileText className="size-5" /> : <Upload className="size-5" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">
                {isDragOver ? dropHereLabel : emptyLabel}
              </p>
              {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
            </div>
            {fileName ? (
              <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
                <FileText className="size-3 shrink-0" />
                <span className="truncate">{fileName}</span>
              </span>
            ) : null}
          </>
        )}

        {isUploading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/80 backdrop-blur-[2px]">
            <Spinner className={cn(isImage ? 'size-10' : 'size-8', 'text-violet-600')} />
            <p className="text-xs font-semibold text-violet-800">{uploadingLabel}</p>
          </div>
        ) : null}

        {!isUploading && isDragOver && isImage ? (
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

      <button
        type="button"
        onClick={openFilePicker}
        disabled={isUploading}
        className="group inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {isUploading ? (
          <Spinner className="mr-1.5 size-4 text-white" />
        ) : (
          <Upload className="mr-1.5 size-4" />
        )}
        {isUploading ? uploadingLabel : uploadLabel}
      </button>

      {!isImage && hint ? (
        <p className="text-center text-xs text-slate-500">{hint}</p>
      ) : null}
      {isImage && hint ? (
        <p className="text-center text-xs text-slate-500">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-center text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
