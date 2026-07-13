"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flag, ImagePlus, Loader2, ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui";
import { getAvatarGradient } from "@/lib/avatar-utils";
import { formatLessonDateLabel } from "@/components/calendar/utils/format-locale";
import type { LessonItem } from "@/services/my-lessons/my-lessons.api";
import { cloudinaryService } from "@/services/cloudinary/cloudinary.service";
import {
  CLOUDINARY_FOLDER,
  LESSON_COMPLAINT_IMAGE_EXTENSIONS,
  LESSON_COMPLAINT_REASON_KEYS,
  MAX_IMAGE_SIZE_MB,
  MAX_LESSON_COMPLAINT_ATTACHMENTS,
  type LessonComplaintReasonKey,
} from "@mezon-tutors/shared";
import { usePublicAppSettings } from "@/services";

export type LessonComplaintAttachmentInput = {
  url: string;
  publicId: string;
};

type PendingAttachment = {
  localId: string;
  url: string;
  publicId: string;
  previewUrl: string;
  uploading: boolean;
};

type ComplainLessonDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    reason: string,
    message?: string,
    attachments?: LessonComplaintAttachmentInput[],
  ) => void;
  isLoading?: boolean;
  lesson: LessonItem | null;
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
};

const allowedImageExt = new Set<string>(LESSON_COMPLAINT_IMAGE_EXTENSIONS);

export function ComplainLessonDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  lesson,
}: ComplainLessonDialogProps) {
  const locale = useLocale();
  const t = useTranslations("MyLessons.panels.lessons.complaint");
  const tReasons = useTranslations("MyLessons.panels.lessons.complaint.reasons");
  const { data: publicAppSettings } = usePublicAppSettings();
  const disputePeriodHours = publicAppSettings?.disputePeriodHours;

  const [reasonKey, setReasonKey] = useState<LessonComplaintReasonKey | "">("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSeqRef = useRef(0);

  const resetForm = useCallback(() => {
    setReasonKey("");
    setMessage("");
    setAttachments([]);
    setUploadError(null);
    uploadSeqRef.current += 1;
  }, []);

  const cleanupAttachments = useCallback((items: PendingAttachment[]) => {
    for (const item of items) {
      if (item.publicId) {
        void cloudinaryService.deleteFile(item.publicId).catch(() => null);
      }
      if (item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleClose = () => {
    cleanupAttachments(attachments);
    resetForm();
    onClose();
  };

  const reasonOptions = useMemo(
    () =>
      LESSON_COMPLAINT_REASON_KEYS.map((key) => ({
        value: key,
        label: tReasons(key),
      })),
    [tReasons],
  );

  const selectedReasonLabel = useMemo(() => {
    if (!reasonKey) return "";
    return tReasons(reasonKey);
  }, [reasonKey, tReasons]);

  const hasUploading = attachments.some((item) => item.uploading);
  const canAddMore = attachments.length < MAX_LESSON_COMPLAINT_ATTACHMENTS;

  const uploadFiles = async (files: File[]) => {
    const remaining = MAX_LESSON_COMPLAINT_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setUploadError(t("dialog.imagesMax", { max: MAX_LESSON_COMPLAINT_ATTACHMENTS }));
      return;
    }

    const bytesLimit = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    const toUpload = files.slice(0, remaining);

    for (const file of toUpload) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowedImageExt.has(ext)) {
        setUploadError(t("dialog.imagesInvalidType"));
        return;
      }
      if (file.size > bytesLimit) {
        setUploadError(t("dialog.imagesTooLarge", { maxMb: MAX_IMAGE_SIZE_MB }));
        return;
      }
    }

    setUploadError(null);

    for (const file of toUpload) {
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      uploadSeqRef.current += 1;
      const seq = uploadSeqRef.current;

      setAttachments((prev) => [
        ...prev,
        { localId, url: "", publicId: "", previewUrl, uploading: true },
      ]);

      try {
        const uploaded = await cloudinaryService.uploadFileWithSignature(
          file,
          CLOUDINARY_FOLDER.LESSON_COMPLAINT,
          "image",
        );
        if (uploadSeqRef.current !== seq) {
          void cloudinaryService.deleteFile(uploaded.publicId).catch(() => null);
          URL.revokeObjectURL(previewUrl);
          continue;
        }
        setAttachments((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  url: uploaded.secureUrl,
                  publicId: uploaded.publicId,
                  uploading: false,
                }
              : item,
          ),
        );
      } catch {
        if (uploadSeqRef.current === seq) {
          setUploadError(t("dialog.imagesUploadFailed"));
        }
        setAttachments((prev) => prev.filter((item) => item.localId !== localId));
        URL.revokeObjectURL(previewUrl);
      }
    }
  };

  const handleRemoveAttachment = (localId: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target) {
        if (target.publicId) {
          void cloudinaryService.deleteFile(target.publicId).catch(() => null);
        }
        if (target.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(target.previewUrl);
        }
      }
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const handleConfirm = () => {
    if (!selectedReasonLabel.trim() || hasUploading) return;
    const uploaded = attachments
      .filter((item) => item.url && item.publicId && !item.uploading)
      .map((item) => ({ url: item.url, publicId: item.publicId }));
    onConfirm(
      selectedReasonLabel,
      message.trim() || undefined,
      uploaded.length > 0 ? uploaded : undefined,
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden rounded-3xl border-violet-100/80 p-0 shadow-2xl shadow-violet-200/30 sm:max-w-[460px]"
      >
        <div className="relative overflow-hidden bg-brand-gradient-135 px-6 pb-5 pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm">
              <Flag className="size-5 text-white" />
            </div>
            <DialogHeader className="space-y-1.5 p-0 text-left">
              <DialogTitle className="text-lg font-bold tracking-tight text-white">
                {t("dialog.title")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-violet-50/95">
                {lesson
                  ? t("dialog.subtitle", {
                      tutor: lesson.tutor,
                      date: lesson.dateLabel,
                      time: lesson.timeLabel,
                    })
                  : null}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {lesson ? (
          <>
            <div className="flex max-h-[min(70vh,520px)] flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="flex items-center gap-3.5 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3.5">
                <Avatar className="size-12 shrink-0 rounded-xl border border-violet-100">
                  {lesson.tutorAvatar ? (
                    <AvatarImage
                      src={lesson.tutorAvatar}
                      alt={lesson.tutor}
                      className="rounded-lg object-cover"
                    />
                  ) : null}
                  <AvatarFallback className={`rounded-lg bg-gradient-to-br ${getAvatarGradient(lesson.source, lesson.groupName)} text-xs font-bold text-white`}>
                    {getInitials(lesson.tutor)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">
                    {lesson.tutor}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    <span className="font-semibold text-violet-600">
                      {formatLessonDateLabel(lesson.dateLabel, locale)}
                    </span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="font-bold text-slate-700">{lesson.timeLabel}</span>
                  </p>
                  {lesson.subject ? (
                    <p className="mt-1.5 truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {lesson.subject}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="complaint-reason"
                  className="block text-xs font-semibold tracking-wide text-slate-900"
                >
                  {t("dialog.reasonLabel")}
                </label>
                <Select
                  value={reasonKey}
                  onValueChange={(v) => setReasonKey(v as LessonComplaintReasonKey)}
                >
                  <SelectTrigger
                    id="complaint-reason"
                    className="h-11 w-full rounded-xl border-violet-100 bg-slate-50/70 px-3.5 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-violet-200"
                  >
                    <SelectValue placeholder={t("dialog.reasonPlaceholder")}>
                      {reasonOptions.find((r) => r.value === reasonKey)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {reasonOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="py-2.5">
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="complaint-message"
                  className="block text-xs font-semibold tracking-wide text-slate-900"
                >
                  {t("dialog.messageLabel")}
                </label>
                <Textarea
                  id="complaint-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("dialog.messagePlaceholder")}
                  className="min-h-[100px] resize-none rounded-xl border-violet-100 bg-slate-50/70 p-3.5 text-sm leading-relaxed text-slate-700 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-violet-200"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="block text-xs font-semibold tracking-wide text-slate-900">
                    {t("dialog.imagesLabel")}
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {t("dialog.imagesCount", {
                      count: attachments.length,
                      max: MAX_LESSON_COMPLAINT_ATTACHMENTS,
                    })}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {t("dialog.imagesHint", {
                    max: MAX_LESSON_COMPLAINT_ATTACHMENTS,
                    maxMb: MAX_IMAGE_SIZE_MB,
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((item) => (
                    <div
                      key={item.localId}
                      className="relative size-20 overflow-hidden rounded-xl border border-violet-100 bg-slate-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                      {item.uploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="size-5 animate-spin text-white" />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
                        onClick={() => handleRemoveAttachment(item.localId)}
                        disabled={item.uploading || isLoading}
                        aria-label={t("dialog.imagesRemove")}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {canAddMore ? (
                    <button
                      type="button"
                      className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || hasUploading}
                    >
                      <ImagePlus className="size-5" />
                      <span className="text-[10px] font-semibold">{t("dialog.imagesAdd")}</span>
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={LESSON_COMPLAINT_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) {
                      void uploadFiles(Array.from(files));
                    }
                    e.target.value = "";
                  }}
                />
                {uploadError ? (
                  <p className="text-xs text-rose-600">{uploadError}</p>
                ) : null}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-violet-200/80 bg-violet-50/70 px-3 py-2.5">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-violet-600"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-violet-900/90">
                  {disputePeriodHours != null
                    ? t("dialog.windowHint", { hours: disputePeriodHours })
                    : null}
                </p>
              </div>
            </div>

            <DialogFooter className="m-0 gap-2 border-t border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-6 pt-4 pb-6 sm:justify-end">
              <Button
                variant="outline"
                className="h-10 rounded-full border-slate-200 px-5"
                onClick={handleClose}
                disabled={isLoading}
              >
                {t("dialog.dismiss")}
              </Button>
              <Button
                className="h-10 rounded-full border-0 bg-brand-gradient px-6 font-semibold text-white shadow-md shadow-violet-300/40 hover:opacity-95 disabled:opacity-50"
                onClick={handleConfirm}
                disabled={!reasonKey || isLoading || hasUploading}
              >
                {isLoading ? t("dialog.submitting") : t("dialog.confirm")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
