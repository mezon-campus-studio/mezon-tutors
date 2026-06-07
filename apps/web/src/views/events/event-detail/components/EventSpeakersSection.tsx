"use client";

import type { EventOrganizerDto } from "@mezon-tutors/shared";
import { ArrowUpRight, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EventSpeakersSectionProps = {
  organizers: EventOrganizerDto[];
};

type ActiveOrganizer = {
  organizer: EventOrganizerDto;
  index: number;
};

export function EventSpeakersSection({ organizers }: EventSpeakersSectionProps) {
  const t = useTranslations("Events.detail");
  const [activeOrganizer, setActiveOrganizer] = useState<ActiveOrganizer | null>(
    null,
  );

  if (organizers.length === 0) return null;

  return (
    <>
      <section
        id="speakers"
        className="relative scroll-mt-28 overflow-hidden bg-[#08070f] py-10 sm:scroll-mt-32 sm:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[40px_40px]"
        />
        <div className="pointer-events-none absolute -top-24 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mb-8 space-y-2.5 sm:mb-12 sm:space-y-3">
            <p className="text-xs font-bold tracking-[0.25em] text-violet-400 uppercase">
              {t("sections.speakers.badge")}
            </p>
            <h2 className="font-serif whitespace-pre-line text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
              {t("sections.speakers.title")}
            </h2>
            <p className="max-w-lg text-sm text-white/50 sm:text-base">
              {t("sections.speakers.tapHint")}
            </p>
          </div>

          <div
            className={cn(
              "grid gap-1.5",
              organizers.length === 1 && "max-w-xs",
              organizers.length === 2 && "sm:max-w-2xl sm:grid-cols-2",
              organizers.length >= 3 && "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {organizers.map((organizer, index) => (
              <SpeakerCard
                key={organizer.id}
                organizer={organizer}
                index={index}
                onSelect={() => setActiveOrganizer({ organizer, index })}
              />
            ))}
          </div>
        </div>
      </section>

      <SpeakerDetailDialog
        active={activeOrganizer}
        onOpenChange={(open) => {
          if (!open) setActiveOrganizer(null);
        }}
      />
    </>
  );
}

function SpeakerCard({
  organizer,
  index,
  onSelect,
}: {
  organizer: EventOrganizerDto;
  index: number;
  onSelect: () => void;
}) {
  const t = useTranslations("Events.detail");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${organizer.name} — ${t("sections.speakers.viewProfile")}`}
      className="group relative aspect-[3/4] w-full cursor-pointer overflow-hidden text-left transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08070f]"
    >
      <Image
        src={organizer.imageUrl}
        alt=""
        fill
        sizes="(max-width: 1024px) 50vw, 33vw"
        className="object-cover brightness-[0.72] transition duration-500 group-hover:scale-[1.04] group-hover:brightness-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/20 transition duration-300 group-hover:from-black/85" />

      <span className="absolute top-3 right-3 font-mono text-xs text-white/40">
        {String(index + 1).padStart(2, "0")}
      </span>

      <span
        aria-hidden
        className="absolute top-3 left-3 size-2.5 rounded-full bg-violet-500 opacity-80 ring-4 ring-violet-500/20 transition group-hover:opacity-100"
      />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <span className="mb-2 inline-block rounded-sm bg-violet-600/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
          {organizer.category}
        </span>
        <h3 className="font-serif text-xl font-semibold text-white sm:text-2xl">
          {organizer.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-white/70 sm:text-sm">
          {organizer.role}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-900 shadow-md transition group-hover:bg-white">
          {t("sections.speakers.viewProfile")}
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </button>
  );
}

function SpeakerDetailDialog({
  active,
  onOpenChange,
}: {
  active: ActiveOrganizer | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Events.detail");

  if (!active) return null;

  const { organizer, index } = active;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/80 backdrop-blur-sm"
        className="max-w-4xl overflow-hidden rounded-lg border-0 p-0 sm:max-w-4xl"
      >
        <DialogTitle className="sr-only">{organizer.name}</DialogTitle>

        <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-[280px] bg-white lg:min-h-full">
            <Image
              src={organizer.imageUrl}
              alt={organizer.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-top"
              priority
            />
          </div>

          <div className="relative flex flex-col justify-center bg-[#12101a] p-8 lg:p-10">
            <DialogClose
              className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogClose>

            <span className="mb-4 inline-flex w-fit rounded-sm bg-violet-600/90 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
              {organizer.category}
            </span>

            <h2 className="font-serif text-3xl font-semibold text-white sm:text-4xl">
              {organizer.name}
            </h2>
            <p className="mt-2 text-sm text-white/70">{organizer.role}</p>

            <p className="mt-6 text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">
              {t("sections.speakers.speakerLabel", {
                index: String(index + 1).padStart(2, "0"),
              })}
            </p>

            {organizer.bio ? (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
                {organizer.bio}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
