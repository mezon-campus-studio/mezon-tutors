"use client";

import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";

export type ImageGalleryItem = {
  url: string;
  id?: string;
  alt?: string;
};

export type ImageAttachmentGalleryLabels = {
  attachmentAlt?: string;
  moreAttachments?: string;
  galleryTitle?: string;
  galleryDescription?: string;
  galleryThumbnails?: string;
  galleryPrevious?: string;
  galleryNext?: string;
};

export type ImageAttachmentGalleryProps = {
  images: ImageGalleryItem[];
  previewVisibleCount?: number;
  labels?: ImageAttachmentGalleryLabels;
  className?: string;
  previewClassName?: string;
};

const DEFAULT_PREVIEW_VISIBLE = 2;

export function toImageGalleryItems(
  items: Array<{ url: string; public_id?: string; alt?: string }>,
): ImageGalleryItem[] {
  return items.map((item, index) => ({
    url: item.url,
    id: item.public_id ?? item.url,
    alt: item.alt,
  }));
}

export function ImageAttachmentGallery({
  images,
  previewVisibleCount = DEFAULT_PREVIEW_VISIBLE,
  labels,
  className,
  previewClassName,
}: ImageAttachmentGalleryProps) {
  const t = useTranslations("Common.imageGallery");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const copy = useMemo(
    () => ({
      attachmentAlt: (index: number) =>
        labels?.attachmentAlt ?? t("attachmentAlt", { index }),
      moreAttachments: (count: number) =>
        labels?.moreAttachments ?? t("moreAttachments", { count }),
      galleryTitle: labels?.galleryTitle ?? t("galleryTitle"),
      galleryDescription: (current: number, total: number) =>
        labels?.galleryDescription ?? t("galleryDescription", { current, total }),
      galleryThumbnails: labels?.galleryThumbnails ?? t("galleryThumbnails"),
      galleryPrevious: labels?.galleryPrevious ?? t("galleryPrevious"),
      galleryNext: labels?.galleryNext ?? t("galleryNext"),
    }),
    [labels, t],
  );

  const previewItems = images.slice(0, previewVisibleCount);
  const hiddenCount = Math.max(0, images.length - previewVisibleCount);
  const total = images.length;
  const hasMultiple = total > 1;

  useEffect(() => {
    if (!isOpen) return;
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [isOpen, activeIndex, images.length]);

  const openGallery = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex(index);
    setIsOpen(true);
  };

  const goToPrevious = useCallback(() => {
    setActiveIndex((current) => (current <= 0 ? total - 1 : current - 1));
  }, [total]);

  const goToNext = useCallback(() => {
    setActiveIndex((current) => (current >= total - 1 ? 0 : current + 1));
  }, [total]);

  useEffect(() => {
    if (!isOpen || !hasMultiple) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, hasMultiple, goToPrevious, goToNext]);

  if (images.length === 0) {
    return null;
  }

  const activeImage = images[activeIndex];

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {previewItems.map((image, index) => {
          const isLastPreview = index === previewVisibleCount - 1;
          const showMoreOverlay = isLastPreview && hiddenCount > 0;
          const imageKey = image.id ?? image.url;

          return (
            <button
              key={`${imageKey}-${index}`}
              type="button"
              onClick={(e) => openGallery(index, e)}
              className={cn(
                "group cursor-pointer relative size-20 overflow-hidden rounded-xl border border-violet-100 bg-violet-50/40 transition hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
                previewClassName,
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt ?? copy.attachmentAlt(index + 1)}
                className={cn(
                  "size-full object-cover transition duration-200 group-hover:scale-105",
                  showMoreOverlay && "brightness-[0.45] group-hover:brightness-[0.55]",
                )}
              />
              {showMoreOverlay ? (
                <span className="absolute inset-0 flex items-center justify-center bg-violet-950/25 text-base font-bold tracking-wide text-white">
                  {copy.moreAttachments(hiddenCount)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton
          className="gap-0 overflow-hidden rounded-3xl border-violet-100/80 p-0 shadow-2xl shadow-violet-200/40 sm:max-w-5xl [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/15"
        >
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_55%,#a855f7_100%)] px-5 py-4 pr-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                <Images className="size-5 text-white" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold tracking-tight text-white">
                  {copy.galleryTitle}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-violet-100/95">
                  {copy.galleryDescription(activeIndex + 1, total)}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex max-h-[min(78vh,680px)] min-h-[300px] flex-col bg-slate-950 sm:flex-row">
            <div className="relative flex min-h-[260px] flex-1 flex-col sm:min-h-0">
              <div className="relative flex flex-1 items-center justify-center bg-slate-950 p-4 sm:p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.18)_0%,transparent_70%)]"
                />

                {hasMultiple ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-sm hover:bg-black/55 hover:text-white sm:left-4"
                      onClick={goToPrevious}
                      aria-label={copy.galleryPrevious}
                    >
                      <ChevronLeft className="size-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-sm hover:bg-black/55 hover:text-white sm:right-4"
                      onClick={goToNext}
                      aria-label={copy.galleryNext}
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </>
                ) : null}

                {activeImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={activeImage.url}
                    src={activeImage.url}
                    alt={activeImage.alt ?? copy.attachmentAlt(activeIndex + 1)}
                    className="relative z-[1] max-h-[min(58vh,560px)] max-w-full rounded-lg object-contain shadow-2xl shadow-black/40 ring-1 ring-white/10"
                  />
                ) : null}
              </div>

              {hasMultiple ? (
                <div className="flex items-center justify-center gap-1.5 border-t border-white/10 bg-slate-900/90 px-4 py-2.5 sm:hidden">
                  {images.map((image, index) => (
                    <button
                      key={`dot-${image.id ?? image.url}-${index}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "size-2 rounded-full transition",
                        index === activeIndex
                          ? "w-5 bg-violet-400"
                          : "bg-white/25 hover:bg-white/40",
                      )}
                      aria-label={image.alt ?? copy.attachmentAlt(index + 1)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {hasMultiple ? (
              <aside className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 bg-[linear-gradient(180deg,#1e1035_0%,#0f172a_100%)] p-3 sm:w-[7.5rem] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:border-t-0 sm:border-l sm:border-white/10 sm:py-4">
                <p className="hidden px-1 text-[10px] font-bold uppercase tracking-wider text-violet-300/80 sm:block">
                  {copy.galleryThumbnails}
                </p>
                <div className="flex gap-2 sm:flex-col">
                  {images.map((image, index) => {
                    const isActive = index === activeIndex;
                    const imageKey = image.id ?? image.url;
                    return (
                      <button
                        key={`${imageKey}-thumb-${index}`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:size-[4.75rem]",
                          isActive
                            ? "border-violet-400 shadow-lg shadow-violet-900/50 ring-2 ring-violet-400/40"
                            : "border-white/10 opacity-70 hover:border-violet-400/50 hover:opacity-100",
                        )}
                      >
                        <img
                          src={image.url}
                          alt={image.alt ?? copy.attachmentAlt(index + 1)}
                          className="size-full object-cover"
                        />
                        {isActive ? (
                          <span className="absolute inset-x-0 bottom-0 bg-violet-600/90 py-0.5 text-center text-[9px] font-bold text-white">
                            {index + 1}/{total}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </aside>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
