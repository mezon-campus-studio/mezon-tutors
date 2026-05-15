"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  BECOME_TUTOR_STEPS,
  calculateStepProgress,
  parseVimeoId,
  parseYouTubeId,
} from "@mezon-tutors/shared";
import { Button, Input, Spinner } from "@/components/ui";
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

type VideoFormValues = {
  videoLink: string;
};

export default function VideoPage() {
  const t = useTranslations("BecomeTutor.video");
  const router = useRouter();
  const [videoState, setVideoState] = useAtom(tutorProfileVideoAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const { videoLink, videoId } = videoState;
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const videoInputSectionRef = useRef<HTMLDivElement | null>(null);
  const [isCheckingVideo, setIsCheckingVideo] = useState(false);
  const setLastSavedAt = useSetAtom(tutorProfileLastSavedAtAtom);

  const form = useForm<VideoFormValues>({
    defaultValues: {
      videoLink: videoLink ?? "",
    },
    mode: "onChange",
  });

  const { control, handleSubmit, getValues } = form;

  const bestPractices = t.raw("bestPractices") as string[];
  const avoidItems = t.raw("avoidItems") as string[];

  const handleAddLink = async (values: VideoFormValues) => {
    setDurationError(null);
    setVideoDuration(null);

    const trimmed = (values.videoLink ?? "").trim();
    if (!trimmed) {
      setDurationError(t("errors.emptyLink"));
      return;
    }

    let nextId: { type: "youtube" | "vimeo"; id: string } | null = null;

    const ytId = parseYouTubeId(trimmed);
    if (ytId) {
      nextId = { type: "youtube", id: ytId };
    } else {
      const vimeoId = parseVimeoId(trimmed);
      if (vimeoId) {
        nextId = { type: "vimeo", id: vimeoId };
      }
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
            if (durationSeconds > 120) {
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

  const handleSaveExit = useCallback(async () => {
    const raw = (getValues("videoLink") ?? "").trim();
    setVideoState((prev) => ({
      ...prev,
      videoLink: raw,
    }));
    setLastSavedAt(new Date().toISOString());
  }, [getValues, setLastSavedAt, setVideoState]);

  const handleContinue = (_values: VideoFormValues) => {
    if (isCheckingVideo) return;
    if (!videoId) {
      setDurationError(t("errors.missingBeforeContinue"));
      const section = videoInputSectionRef.current;
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (videoDuration !== null && videoDuration > 120) {
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
      continueDisabled={isCheckingVideo}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2" ref={videoInputSectionRef}>
          <BecomeTutorSection
            eyebrow="Preview"
            title={t("title")}
            description={t("subtitle")}
          >
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#faf7ff,#fdf2f8)]"
              style={{ aspectRatio: "16/9", minHeight: "200px" }}
              aria-busy={isCheckingVideo}
            >
              {videoId ? (
                <iframe
                  src={
                    videoId.type === "youtube"
                      ? `https://www.youtube.com/embed/${videoId.id}?rel=0`
                      : `https://player.vimeo.com/video/${videoId.id}?autoplay=0`
                  }
                  title="Profile video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 size-full border-0"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
                    <Video className="size-6" />
                  </div>
                  <p className="max-w-xs text-center text-xs text-slate-500 sm:text-sm">
                    {t("previewPlaceholder")}
                  </p>
                </div>
              )}
              {isCheckingVideo ? (
                <div className="absolute inset-0 z-1 flex flex-col items-center justify-center gap-2 bg-white/75 backdrop-blur-[2px]">
                  <Spinner className="size-10 text-violet-600" />
                  <p className="text-xs font-semibold text-violet-800">
                    {t("link.checking")}
                  </p>
                </div>
              ) : null}
            </div>
          </BecomeTutorSection>

          <BecomeTutorSection eyebrow="Video link" title={t("link.label")}>
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
                className="h-11 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
              >
                {isCheckingVideo ? (
                  <Spinner className="mr-1.5 size-4 text-white" />
                ) : null}
                {isCheckingVideo ? t("link.checking") : t("link.addButton")}
              </Button>
            </div>
            {durationError ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                {durationError}
              </div>
            ) : null}
          </BecomeTutorSection>
        </div>

        <div className="space-y-5">
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
    </BecomeTutorShell>
  );
}
