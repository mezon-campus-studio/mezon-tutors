"use client";

import type { EventDetailDto } from "@mezon-tutors/shared";
import { Calendar, Check, Copy, MapPin, Share2 } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui";
import {
  formatEventLocationLabel,
  isRegistrationOnlyEventDto,
  pickEventContent,
  pickEventShareContent,
} from "@/lib/event-view";
import { EventReveal } from "@/views/events/event-detail/components/EventReveal";

type EventShareBannerProps = {
  event: EventDetailDto;
  dateLabel: string;
};

export function EventShareBanner({ event, dateLabel }: EventShareBannerProps) {
  const t = useTranslations("Events.detail");
  const locale = useLocale();
  const content = pickEventContent(event, locale);
  const { shareTitle, shareDescription } = pickEventShareContent(event, locale);
  const [copied, setCopied] = useState(false);

  const locationLabel = formatEventLocationLabel(event.location, locale, {
    online: t("meta.online"),
    registrationOnly: t("meta.registrationOnly"),
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="share" className="scroll-mt-28 py-8 sm:scroll-mt-32 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <EventReveal>
          <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-lg shadow-violet-100/50">
            <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-4 p-6 sm:p-8">
                <p className="text-xs font-bold tracking-[0.2em] text-violet-600 uppercase">
                  {t("sections.share.badge")}
                </p>
                <h2 className="whitespace-pre-line text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {content.title}
                </h2>
                <p className="max-w-lg text-sm leading-7 text-slate-600">
                  {shareDescription}
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                    <Calendar className="size-3.5 text-violet-600" />
                    {dateLabel}
                  </span>
                  {locationLabel ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                      <MapPin className="size-3.5 text-violet-600" />
                      {locationLabel}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-6 text-slate-500">
                  {t("sections.share.hint")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    className="h-10 rounded-full border-violet-200 px-5 text-sm font-semibold text-violet-800 hover:bg-violet-50"
                  >
                    {copied ? (
                      <Check className="mr-2 size-4 text-emerald-600" />
                    ) : (
                      <Copy className="mr-2 size-4" />
                    )}
                    {copied ? t("sections.share.copied") : t("sections.share.copyLink")}
                  </Button>
                  <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="h-10 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white">
                      <Share2 className="mr-2 size-4" />
                      {t("sections.share.registerCta")}
                    </Button>
                  </a>
                </div>
              </div>

              <div className="relative min-h-[220px] border-t border-violet-100 bg-violet-50/50 lg:min-h-full lg:border-t-0 lg:border-l">
                <div className="relative m-5 overflow-hidden rounded-2xl border border-violet-100 shadow-md sm:m-6">
                  <div className="relative aspect-[1.91/1]">
                    <Image
                      src={event.ogImageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1 border-t border-violet-100 bg-white px-4 py-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                      {shareTitle}
                    </p>
                    <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                      {shareDescription}
                    </p>
                    <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                      {t("sections.share.previewLabel")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </EventReveal>
      </div>
    </section>
  );
}
