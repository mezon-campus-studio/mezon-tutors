"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { getYoutubeEmbedUrl } from "@mezon-tutors/shared";
import { PlayIcon, XIcon } from "lucide-react";

type VideoPreviewProps = {
  videoUrl?: string | null;
  height?: number;
  title?: string;
};

export default function VideoPreview({ videoUrl, height = 260, title = "" }: VideoPreviewProps) {
  const t = useTranslations("Tutors.VideoPreview");
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const embedUrl = useMemo(() => getYoutubeEmbedUrl(videoUrl), [videoUrl]);
  const youtubeId = useMemo(() => {
    if (!embedUrl) return null;
    const last = embedUrl.split("/").filter(Boolean).pop();
    return last ?? null;
  }, [embedUrl]);

  const isYoutubeVideo = Boolean(embedUrl && youtubeId);
  const hasVideoUrl = Boolean(videoUrl);
  const canOpenVideo = isYoutubeVideo;

  const thumbnailUrl = useMemo(() => {
    if (!isYoutubeVideo || !youtubeId) return null;
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }, [isYoutubeVideo, youtubeId]);

  useEffect(() => {
    if (!isVideoOpen) return;
    if (typeof window === "undefined") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVideoOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isVideoOpen]);

  useEffect(() => {
    if (!isVideoOpen) return;
    if (typeof document === "undefined") return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isVideoOpen]);

  return (
    <>
      <div
        role={canOpenVideo ? "button" : undefined}
        tabIndex={canOpenVideo ? 0 : -1}
        className={[
          "relative overflow-hidden rounded-2xl bg-slate-100",
          canOpenVideo ? "cursor-pointer" : "cursor-default",
          "flex items-center justify-center",
        ].join(" ")}
        style={
          thumbnailUrl
            ? ({
                height,
                backgroundImage: `url(${thumbnailUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              } as const)
            : ({ height } as const)
        }
        onClick={() => {
          if (!canOpenVideo) return;
          setIsVideoOpen(true);
        }}
        onKeyDown={(e) => {
          if (!canOpenVideo) return;
          if (e.key === "Enter" || e.key === " ") setIsVideoOpen(true);
        }}
      >
        {thumbnailUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-violet-600/95 pl-1">
              <PlayIcon className="size-7 text-white" />
            </div>
          </div>
        ) : (
          <div className="px-4 text-center">
            {title ? <div className="text-sm font-semibold text-slate-900">{title}</div> : null}
            <div className="mt-1 text-sm text-slate-600">
              {!hasVideoUrl ? t("noVideo") : !isYoutubeVideo ? t("invalidVideo") : t("pressToPlay")}
            </div>
          </div>
        )}
      </div>

      {canOpenVideo && isVideoOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-1000 flex items-center justify-center bg-slate-950/70 p-4"
              onClick={() => setIsVideoOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setIsVideoOpen(false);
              }}
            >
              <div
                className="relative w-[85vw] max-w-5xl overflow-hidden rounded-2xl bg-black"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute cursor-pointer right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={() => setIsVideoOpen(false)}
                  aria-label={t("close")}
                >
                  <XIcon className="size-5" />
                </button>

                <div className="aspect-video w-full bg-slate-950">
                  {embedUrl ? (
                    <iframe
                      src={`${embedUrl}?autoplay=1&rel=0&modestbranding=1`}
                      title="YouTube video"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
