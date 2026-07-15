"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Info,
  Link2,
  Upload,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ACCEPT_INTRO_VIDEO_TYPES,
  BECOME_TUTOR_STEPS,
  calculateStepProgress,
  CLOUDINARY_FOLDER,
  MAX_INTRO_VIDEO_SIZE_MB,
  parseYouTubeId,
  resolveIntroVideoMaxDurationSeconds,
} from "@mezon-tutors/shared";
import UploadFile from "@/components/common/UploadFile";
import { Button, Input, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cloudinaryService, usePublicAppSettings } from "@/services";
import {
  markStepCompletedAtom,
  tutorProfileLastSavedAtAtom,
  tutorProfileVideoAtom,
} from "@/store";
import {
  BecomeTutorSection,
  BecomeTutorShell,
} from "../_shared/BecomeTutorShell";

const CURRENT_STEP = BECOME_TUTOR_STEPS.VIDEO;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

type VideoInputMode = "pasteLink" | "upload";

type VideoFormValues = {
  videoLink: string;
};

const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm"]);

function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to read video metadata"));
    };
    video.src = URL.createObjectURL(file);
  });
}

export default function VideoPage() {
  const t = useTranslations("BecomeTutor.video");
  const router = useRouter();
  const { data: publicAppSettings } = usePublicAppSettings();
  const maxVideoDurationSeconds = resolveIntroVideoMaxDurationSeconds(
    publicAppSettings?.youtubeSettings ?? null,
  );
  const maxVideoDurationMinutes = Math.floor(maxVideoDurationSeconds / 60);
  const [videoState, setVideoState] = useAtom(tutorProfileVideoAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const { videoLink, videoId } = videoState;
  const [inputMode, setInputMode] = useState<VideoInputMode>("upload");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading">("idle");
  const videoInputSectionRef = useRef<HTMLDivElement | null>(null);
  const [isCheckingVideo, setIsCheckingVideo] = useState(false);
  const setLastSavedAt = useSetAtom(tutorProfileLastSavedAtAtom);

  const form = useForm<VideoFormValues>({
    defaultValues: {
      videoLink: videoLink ?? "",
    },
    mode: "onChange",
  });

  const { control, handleSubmit, getValues, setValue } = form;

  const bestPractices = t.raw("bestPractices") as string[];
  const avoidItems = t.raw("avoidItems") as string[];
  const isUploading = uploadStage !== "idle";
  const isBusy = isCheckingVideo || isUploading;

  const uploadingLabel = useMemo(() => {
    if (uploadStage === "uploading") return t("upload.uploadingCloudinary");
    return t("upload.uploadButton");
  }, [t, uploadStage]);

  const handleAddLink = async (values: VideoFormValues) => {
    setDurationError(null);
    setUploadError(null);
    setVideoDuration(null);

    const trimmed = (values.videoLink ?? "").trim();
    if (!trimmed) {
      setDurationError(t("errors.emptyLink"));
      return;
    }

    let nextId: { type: "youtube"; id: string } | null = null;

    const ytId = parseYouTubeId(trimmed);
    if (ytId) {
      nextId = { type: "youtube", id: ytId };
    }

    if (!nextId) {
      setDurationError(t("errors.invalidLink"));
      setVideoState((prev) => ({
        ...prev,
        videoLink: trimmed,
        videoId: null,
      }));
      return;
    }

    setIsCheckingVideo(true);
    try {
      try {
        const res = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(trimmed)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { duration?: number };
          const durationSeconds =
            typeof data.duration === "number" ? data.duration : null;

          if (durationSeconds !== null) {
            setVideoDuration(durationSeconds);
            if (durationSeconds > maxVideoDurationSeconds) {
              setDurationError(t("errors.tooLong"));
              setVideoState((prev) => ({
                ...prev,
                videoLink: trimmed,
                videoId: null,
              }));
              return;
            }
          }
        }
      } catch {}

      setVideoState((prev) => ({
        ...prev,
        videoLink: trimmed,
        videoId: nextId,
      }));
      setLastSavedAt(new Date().toISOString());
    } finally {
      setIsCheckingVideo(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setDurationError(null);
    setUploadError(null);
    setVideoDuration(null);
    setUploadFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeOk = file.type.startsWith("video/");
    if (!ALLOWED_VIDEO_EXTENSIONS.has(ext) || !mimeOk) {
      setUploadError(t("errors.invalidVideoType"));
      return;
    }

    const bytesLimit = MAX_INTRO_VIDEO_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
      setUploadError(
        t("errors.invalidVideoSize", { max: MAX_INTRO_VIDEO_SIZE_MB }),
      );
      return;
    }

    let localDuration: number;
    try {
      localDuration = await getVideoDurationSeconds(file);
    } catch {
      setUploadError(t("errors.uploadFailed"));
      return;
    }

    if (localDuration > maxVideoDurationSeconds) {
      setDurationError(t("errors.tooLong"));
      return;
    }

    setUploadStage("uploading");
    try {
      const uploaded = await cloudinaryService.uploadFileWithSignature(
        file,
        CLOUDINARY_FOLDER.TUTOR_INTRO_VIDEO,
        "video",
      );

      const durationSeconds = uploaded.durationSeconds ?? localDuration;
      setVideoDuration(durationSeconds);

      const cloudinaryUrl = uploaded.secureUrl;
      setValue("videoLink", cloudinaryUrl);
      setVideoState({
        videoLink: cloudinaryUrl,
        videoId: { type: "cloudinary", id: cloudinaryUrl },
      });
      setLastSavedAt(new Date().toISOString());
    } catch {
      setUploadError(t("errors.uploadFailed"));
      setVideoState((prev) => ({
        ...prev,
        videoId: null,
      }));
    } finally {
      setUploadStage("idle");
    }
  };

  const handleSaveExit = useCallback(async () => {
    const raw = (getValues("videoLink") ?? "").trim();
    setVideoState((prev) => ({
      ...prev,
      videoLink: raw,
    }));
    setLastSavedAt(new Date().toISOString());
  }, [getValues, setLastSavedAt, setVideoState]);

  const handleContinue = (_values: VideoFormValues) => {
    if (isBusy) return;
    if (!videoId) {
      setDurationError(t("errors.missingBeforeContinue"));
      const section = videoInputSectionRef.current;
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (videoDuration !== null && videoDuration > maxVideoDurationSeconds) {
      setDurationError(t("errors.tooLong"));
      return;
    }
    markStepCompleted(CURRENT_STEP);
    router.push("/become-tutor/availability");
  };

  return (
    <BecomeTutorShell
      headerTitle={t("title")}
      onSaveExit={handleSaveExit}
      stepLabel={t("stepLabel")}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t("progressPercentLabel", { percent: PROGRESS_PERCENT })}
      nextLabel={t("subtitle")}
      backLabel={t("back")}
      continueLabel={t("continue")}
      currentStep={CURRENT_STEP}
      onBack={() => router.push("/become-tutor/certification")}
      onContinue={handleSubmit(handleContinue)}
      continueDisabled={isBusy}
    >
      <BecomeTutorSection
        eyebrow={t("stepLabel")}
        title={t("title")}
        description={t("subtitle")}
        isShowNote
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="order-2 space-y-3 lg:order-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
              {t("previewLabel")}
              <span className="ml-0.5 text-rose-500">*</span>
            </p>
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#faf7ff,#fdf2f8)] shadow-sm shadow-violet-100/40"
              style={{ aspectRatio: "16/9" }}
            >
              {videoId ? (
                videoId.type === "cloudinary" ? (
                  <video
                    src={videoId.id}
                    controls
                    className="absolute inset-0 size-full border-0 object-contain bg-black"
                  />
                ) : (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId.id}?rel=0`}
                    title="Profile video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 size-full border-0"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40">
                    <Video className="size-6" />
                  </div>
                  <p className="max-w-xs text-center text-xs text-slate-500 sm:text-sm">
                    {t("previewPlaceholder")}
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-5">
              <div className="rounded-3xl border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#f0fdfa)] p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                    <CheckCircle className="size-5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-emerald-900">
                    {t("bestPracticesTitle")}
                  </h3>
                </div>
                <div className="space-y-2">
                  {bestPractices.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-emerald-900/90">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                      <span className="leading-5">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-rose-100 bg-[linear-gradient(135deg,#fff1f2,#fef3f2)] p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
                    <XCircle className="size-5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-rose-900">
                    {t("avoidTitle")}
                  </h3>
                </div>
                <div className="space-y-2">
                  {avoidItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-rose-900/90">
                      <X className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
                      <span className="leading-5">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div ref={videoInputSectionRef} className="order-1 flex flex-col gap-4 lg:order-2">
            <div className="flex items-start gap-2.5 rounded-2xl border border-violet-100 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-4 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
                <Info className="size-4" />
              </div>
              <p className="text-xs leading-5 text-violet-900/90 sm:text-sm sm:leading-6">
                {t("methodNotice")}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/30">
              <div className="border-b border-violet-100 bg-violet-50/40 p-1">
                <div className="flex">
                  {([
                    { mode: "upload" as const, icon: Upload, label: t("tabs.upload") },
                    { mode: "pasteLink" as const, icon: Link2, label: t("tabs.pasteLink") },
                  ]).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setInputMode(mode)}
                      className={cn(
                        "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 sm:flex-none sm:px-5",
                        inputMode === mode
                          ? "bg-white text-violet-700 shadow-sm shadow-violet-200/50"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {inputMode === "upload" ? (
                  <div className="space-y-4">
                    <p className="text-sm font-extrabold text-slate-900">{t("upload.label")}</p>
                    <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-800 sm:text-sm">
                      {t("upload.youtubeNotice")}
                    </p>
                    <UploadFile
                      accept={ACCEPT_INTRO_VIDEO_TYPES}
                      fileName={uploadFileName}
                      isUploading={isUploading}
                      onFile={handleVideoUpload}
                      uploadLabel={t("upload.uploadButton")}
                      uploadingLabel={uploadingLabel}
                      hint={t("upload.hint", {
                        maxSize: MAX_INTRO_VIDEO_SIZE_MB,
                        maxMinutes: maxVideoDurationMinutes,
                      })}
                      emptyLabel={t("upload.emptyLabel")}
                      dropHereLabel={t("upload.dropHereLabel")}
                      error={uploadError ?? undefined}
                    />
                    {durationError ? (
                      <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                        {durationError}
                      </div>
                    ) : null}
                    {videoId?.type === "cloudinary" && !isUploading && !uploadError ? (
                      <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <CheckCircle className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                        {t("upload.success")}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-extrabold text-slate-900">{t("link.label")}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Controller
                        control={control}
                        name="videoLink"
                        render={({ field: { value, onChange } }) => (
                          <Input
                            className="h-11 flex-1 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
                            placeholder={t("link.placeholder")}
                            value={value}
                            disabled={isCheckingVideo}
                            onChange={(e) => onChange(e.target.value)}
                          />
                        )}
                      />
                      <Button
                        type="button"
                        onClick={handleSubmit(handleAddLink)}
                        disabled={isCheckingVideo}
                        className="h-11 shrink-0 rounded-full bg-brand-gradient px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
                      >
                        {isCheckingVideo ? (
                          <Spinner className="mr-1.5 size-4 text-white" />
                        ) : null}
                        {isCheckingVideo ? t("link.checking") : t("link.addButton")}
                      </Button>
                    </div>
                    {durationError ? (
                      <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                        {durationError}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </BecomeTutorSection>
    </BecomeTutorShell>
  );
}
