"use client";

import {
  ArrowRight,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe2,
  MessageCircle,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Video,
  Wallet,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const SLIDE_DURATION_MS = 6000;

const TRUST_AVATARS = [
  { id: "a1", initials: "TN", gradient: "from-violet-500 to-purple-500" },
  { id: "a2", initials: "HL", gradient: "from-purple-500 to-fuchsia-500" },
  { id: "a3", initials: "PV", gradient: "from-fuchsia-500 to-rose-500" },
  { id: "a4", initials: "DM", gradient: "from-indigo-500 to-violet-500" },
];

const SLIDE_KEYS = ["schedule", "mezon", "pricing", "verified"] as const;
type SlideKey = (typeof SLIDE_KEYS)[number];

const SLIDE_ICONS: Record<SlideKey, typeof Calendar> = {
  schedule: Calendar,
  mezon: MessageCircle,
  pricing: Wallet,
  verified: ShieldCheck,
};

export default function HomeHeroSection() {
  const t = useTranslations("Home.Hero");
  const locale = useLocale();
  const isVi = locale === "vi";
  const underlineGradientId = useId().replace(/:/g, "");
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const intervalId = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDE_KEYS.length);
    }, SLIDE_DURATION_MS);
    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  return (
    <section className="relative overflow-hidden pt-12 pb-28 sm:pt-16 lg:pb-32 lg:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#f5f0ff_0%,#faf8ff_35%,#ffffff_72%,#fffdfd_100%)]" />
        <div
          className="absolute -top-44 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-400/45 via-fuchsia-300/35 to-transparent blur-[130px] motion-reduce:animate-none [animation:hero-blob-drift_22s_ease-in-out_infinite]"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="absolute -top-16 -right-24 size-[36rem] rounded-full bg-gradient-to-bl from-rose-300/35 via-fuchsia-200/40 to-transparent blur-[110px] motion-reduce:animate-none [animation:hero-blob-drift_18s_ease-in-out_infinite]"
          style={{ animationDelay: "-2s" }}
        />
        <div className="absolute top-1/4 -left-32 size-[30rem] rounded-full bg-gradient-to-tr from-indigo-300/40 via-violet-200/35 to-transparent blur-[100px] motion-reduce:animate-none [animation:hero-blob-drift_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-24 right-1/4 size-72 rounded-full bg-violet-400/20 blur-[90px] motion-reduce:animate-none [animation:hero-badge-shimmer_14s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(108 92 231) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 85% 65% at 50% 28%, black 28%, transparent 78%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <div className="space-y-8">
          <Badge className="relative h-auto overflow-hidden rounded-full border border-violet-200/80 bg-white/80 px-4 py-1.5 text-xs font-semibold text-violet-800 shadow-md shadow-violet-200/25 ring-1 ring-white/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Sparkles className="relative mr-1.5 size-3.5 shrink-0 text-violet-600" />
            <span className="relative">{t("badge")}</span>
          </Badge>

          <h1
            className={cn(
              "text-balance font-extrabold tracking-[-0.03em] text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:text-5xl lg:text-[3.25rem] xl:text-[3.65rem]",
              isVi
                ? "leading-[1.18] sm:leading-[1.22] lg:leading-[1.24]"
                : "leading-[1.06] sm:leading-[1.1] lg:leading-[1.12]",
            )}
          >
            <span
              className={cn(
                "block text-4xl sm:text-5xl",
                isVi && "leading-[1.2] sm:leading-[1.24] lg:leading-[1.26]",
              )}
            >
              {t("title")}
            </span>
            {isVi ? (
              <>
                <span className="mt-1 block text-4xl leading-[1.2] sm:mt-1.5 sm:text-5xl sm:leading-[1.24] lg:leading-[1.26]">
                  <span className="bg-[linear-gradient(105deg,#6d28d9_0%,#a855f7_55%,#c026d3_100%)] bg-clip-text text-transparent">
                    {t("titleHighlightLead")}
                  </span>
                </span>
                <span className="mt-1 block text-4xl leading-[1.2] sm:mt-1.5 sm:text-5xl sm:leading-[1.24] lg:leading-[1.26]">
                  <span className="relative inline-block pb-1 sm:pb-1.5">
                    <span className="relative z-10 bg-[linear-gradient(105deg,#c026d3_0%,#ec4899_45%,#f472b6_100%)] bg-clip-text text-transparent">
                      {t("titleHighlightTail")}
                    </span>
                    <svg
                      className="absolute -bottom-0.5 left-0 z-0 w-full min-w-[8.5rem] sm:min-w-[12rem]"
                      viewBox="0 0 300 12"
                      fill="none"
                      preserveAspectRatio="none"
                      role="presentation"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 8 C 80 2, 180 2, 298 8"
                        stroke={`url(#hero-underline-${underlineGradientId})`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <defs>
                        <linearGradient
                          id={`hero-underline-${underlineGradientId}`}
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#db2777" />
                          <stop offset="55%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#f472b6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </span>
              </>
            ) : (
              <span className="mt-1 block text-4xl sm:text-5xl lg:mt-1.5">
                <span className="bg-[linear-gradient(105deg,#6d28d9_0%,#a855f7_55%,#c026d3_100%)] bg-clip-text text-transparent">
                  {t("titleHighlightLead")}
                </span>{" "}
                <span className="relative inline-block pb-1.5">
                  <span className="relative z-10 bg-[linear-gradient(105deg,#c026d3_0%,#ec4899_45%,#f472b6_100%)] bg-clip-text text-transparent">
                    {t("titleHighlightTail")}
                  </span>
                  <svg
                    className="absolute -bottom-0.5 left-0 z-0 w-full min-w-[8.5rem] sm:min-w-[12rem]"
                    viewBox="0 0 300 12"
                    fill="none"
                    preserveAspectRatio="none"
                    role="presentation"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 8 C 80 2, 180 2, 298 8"
                      stroke={`url(#hero-underline-${underlineGradientId})`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <defs>
                      <linearGradient
                        id={`hero-underline-${underlineGradientId}`}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#db2777" />
                        <stop offset="55%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </span>
            )}
          </h1>

          <p className="max-w-xl text-base leading-7 text-slate-600 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:120ms] [animation-fill-mode:both] sm:text-lg sm:leading-8">
            {t("description")}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:240ms] [animation-fill-mode:both]">
            <Link href="/tutors" className="inline-flex">
              <Button className="group relative h-12 overflow-hidden rounded-full bg-[linear-gradient(110deg,#6d28d9_0%,#9333ea_42%,#db2777_100%)] px-7 text-sm font-semibold text-white shadow-[0_14px_40px_-12px_rgba(124,58,237,0.55)] ring-1 ring-white/25 transition-[transform,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-[0_20px_44px_-12px_rgba(124,58,237,0.6)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100">
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative flex items-center">
                  {t("startNow")}
                  <ArrowRight className="ml-1 size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
          </div>

          <div className="flex max-w-md flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/55 p-4 shadow-[0_20px_50px_-28px_rgba(91,33,182,0.18)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:360ms] [animation-fill-mode:both] sm:flex-row sm:items-center sm:gap-5 sm:p-5">
            <div className="flex -space-x-2.5">
              {TRUST_AVATARS.map((avatar) => (
                <div
                  key={avatar.id}
                  className={`relative flex size-10 items-center justify-center rounded-full border-[3px] border-white bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${avatar.gradient} text-[11px] font-bold text-white shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:z-10 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
                >
                  {avatar.initials}
                </div>
              ))}
              <div className="flex size-10 items-center justify-center rounded-full border-[3px] border-white bg-[linear-gradient(135deg,#ede9fe,#fae8ff)] text-[10px] font-bold text-violet-800 shadow-md ring-1 ring-violet-200/60">
                +25k
              </div>
            </div>
            <div className="hidden h-10 w-px shrink-0 bg-gradient-to-b from-transparent via-slate-200 to-transparent sm:block" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                {["s1", "s2", "s3", "s4", "s5"].map((id) => (
                  <Star
                    key={id}
                    className="size-4 fill-amber-400 text-amber-400 drop-shadow-sm"
                  />
                ))}
                <span className="ml-1.5 text-sm font-bold tabular-nums text-slate-900">
                  4.9
                </span>
              </div>
              <p className="text-xs leading-snug font-medium text-slate-500">
                {t("trust")}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[26rem] motion-reduce:animate-none lg:mx-0 lg:max-w-none animate-in fade-in slide-in-from-bottom-6 duration-1000 [animation-delay:120ms] [animation-fill-mode:both] motion-safe:[animation:hero-card-float_10s_ease-in-out_infinite]">
          <div className="pointer-events-none absolute -left-6 top-[18%] z-0 hidden h-52 w-40 -rotate-6 overflow-hidden rounded-2xl border-2 border-white shadow-[0_24px_60px_-16px_rgba(91,33,182,0.35)] lg:block">
            <Image
              src="/images/teach.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="160px"
            />
          </div>
          <div className="pointer-events-none absolute -right-2 bottom-[22%] z-20 hidden lg:flex">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-violet-600 shadow-lg shadow-violet-300/30 ring-1 ring-violet-100 backdrop-blur-sm motion-safe:animate-[hero-card-float_7s_ease-in-out_infinite_reverse]">
              <Calendar className="size-6" />
            </span>
          </div>
          <div className="relative z-10">
            <HeroCarousel
              t={t}
              activeSlide={activeSlide}
              isPaused={isPaused}
              onSelect={setActiveSlide}
              onPause={() => setIsPaused(true)}
              onResume={() => setIsPaused(false)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

type CarouselProps = {
  t: (key: string) => string;
  activeSlide: number;
  isPaused: boolean;
  onSelect: (index: number) => void;
  onPause: () => void;
  onResume: () => void;
};

function HeroCarousel({
  t,
  activeSlide,
  isPaused,
  onSelect,
  onPause,
  onResume,
}: CarouselProps) {
  const ActiveIcon = SLIDE_ICONS[SLIDE_KEYS[activeSlide]];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: carousel pause-on-hover is an enhancement; keyboard users pause via focus on dot buttons
    <div
      className="relative mx-auto w-full max-w-[26rem] lg:max-w-none"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
    >
      <div className="pointer-events-none absolute -inset-6 -z-10">
        <div className="absolute inset-x-8 top-8 h-72 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.18),transparent_70%)] blur-3xl" />
        <div className="absolute inset-x-12 bottom-0 h-72 rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(236,72,153,0.15),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/60 bg-white/95 shadow-[0_25px_70px_-24px_rgba(91,33,182,0.28),0_0_0_1px_rgba(255,255,255,0.9)_inset] ring-1 ring-violet-200/25 backdrop-blur-[2px]">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          aria-live="polite"
        >
          <div className="w-full shrink-0">
            <ScheduleSlide t={t} />
          </div>
          <div className="w-full shrink-0">
            <MezonSlide t={t} />
          </div>
          <div className="w-full shrink-0">
            <PricingSlide t={t} />
          </div>
          <div className="w-full shrink-0">
            <VerifiedSlide t={t} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div
          key={activeSlide}
          className="flex min-w-0 items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-500"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
            <ActiveIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {t(`slides.${SLIDE_KEYS[activeSlide]}.label`)}
            </p>
            <p className="truncate text-xs text-slate-500">
              {t(`slides.${SLIDE_KEYS[activeSlide]}.description`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {SLIDE_KEYS.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Slide ${i + 1}`}
              className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-500 ${
                i === activeSlide
                  ? "w-10 bg-slate-200"
                  : "w-1.5 bg-slate-200 hover:bg-slate-300"
              }`}
            >
              {i === activeSlide ? (
                <span
                  key={`${activeSlide}-${isPaused}`}
                  className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#7c3aed,#ec4899)]"
                  style={{
                    animation: isPaused
                      ? "none"
                      : `hero-progress ${SLIDE_DURATION_MS}ms linear forwards`,
                    width: isPaused ? "100%" : undefined,
                  }}
                />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes hero-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function SlideHeader({
  icon: Icon,
  eyebrow,
  title,
  trailing,
}: {
  icon: typeof Calendar;
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(135deg,#6d28d9_0%,#9333ea_45%,#db2777_100%)] px-6 py-5 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="pointer-events-none absolute -top-20 -right-12 size-48 rounded-full bg-white/15 blur-2xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Icon className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              {eyebrow}
            </p>
            <p className="text-base font-bold">{title}</p>
          </div>
        </div>
        {trailing}
      </div>
    </div>
  );
}

function ScheduleSlide({ t }: { t: (key: string) => string }) {
  const week = [
    { id: "mon", label: "Mon", date: 4, dot: false, active: false },
    { id: "tue", label: "Tue", date: 5, dot: true, active: false },
    { id: "wed", label: "Wed", date: 6, dot: true, active: true },
    { id: "thu", label: "Thu", date: 7, dot: true, active: false },
    { id: "fri", label: "Fri", date: 8, dot: true, active: false },
    { id: "sat", label: "Sat", date: 9, dot: true, active: false },
    { id: "sun", label: "Sun", date: 10, dot: false, active: false },
  ];
  const slots = [
    { id: "s1", time: "18:00", state: "available" as const },
    { id: "s2", time: "18:30", state: "available" as const },
    { id: "s3", time: "19:00", state: "selected" as const },
    { id: "s4", time: "19:30", state: "available" as const },
    { id: "s5", time: "20:00", state: "available" as const },
    { id: "s6", time: "20:30", state: "busy" as const },
  ];

  return (
    <div className="flex h-[460px] flex-col">
      <SlideHeader
        icon={Calendar}
        eyebrow={t("slides.schedule.eyebrow")}
        title={t("slides.schedule.title")}
        trailing={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur"
          >
            <Globe2 className="size-3.5" />
            Weekdays
            <ChevronDown className="size-3" />
          </button>
        }
      />

      <div className="grid grid-cols-7 gap-1.5 border-b border-slate-100 px-4 py-4">
        {week.map((day) => (
          <div
            key={day.id}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${
              day.active
                ? "bg-[linear-gradient(180deg,#7c3aed,#9333ea)] text-white shadow-md shadow-violet-300/50"
                : "text-slate-700"
            }`}
          >
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${day.active ? "text-white/80" : "text-slate-400"}`}
            >
              {day.label}
            </span>
            <span className="text-sm font-extrabold">{day.date}</span>
            <span
              className={`size-1 rounded-full ${
                day.active
                  ? "bg-white"
                  : day.dot
                    ? "bg-emerald-500"
                    : "bg-transparent"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-3 px-6 py-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700">
            Available evening slots
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Wed, Nov 6
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const isSelected = slot.state === "selected";
            const isBusy = slot.state === "busy";
            return (
              <div
                key={slot.id}
                className={`relative rounded-xl py-2.5 text-center text-sm font-bold ${
                  isSelected
                    ? "bg-[linear-gradient(135deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] text-white shadow-md shadow-violet-300/50"
                    : isBusy
                      ? "bg-slate-50 text-slate-300 line-through"
                      : "bg-slate-50 text-slate-700"
                }`}
              >
                {slot.time}
                {isSelected ? (
                  <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-violet-600 shadow ring-2 ring-violet-200">
                    ✓
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-[linear-gradient(180deg,#fafafa,#f8fafc)] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900">
              Wed 19:00 · 30 min trial
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Pay only after the lesson
            </p>
          </div>
          <Button className="group h-9 shrink-0 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-4 text-xs font-semibold text-white shadow-md shadow-violet-300/40">
            Confirm time
            <ArrowRight className="ml-1 size-3 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MezonSlide({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex h-[460px] flex-col">
      <SlideHeader
        icon={MessageCircle}
        eyebrow={t("slides.mezon.eyebrow")}
        title={t("slides.mezon.title")}
        trailing={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300" />
              <span className="relative size-1.5 rounded-full bg-emerald-300" />
            </span>
            Live now
          </span>
        }
      />

      <div className="flex-1 space-y-3 bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_100%)] px-5 py-5">
        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Today · 19:42
        </p>

        <div className="flex items-end gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-[10px] font-bold text-white">
            MA
          </div>
          <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-xs leading-5 text-slate-800 shadow-sm ring-1 ring-slate-100">
            See you at 8pm! Don't forget today's vocab list 📚
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-2xl rounded-br-md bg-[linear-gradient(135deg,#7c3aed,#ec4899)] px-3.5 py-2 text-xs font-medium leading-5 text-white shadow-md shadow-violet-300/40">
            Got it, see you tonight!
            <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-white/85">
              19:43
              <CheckCheck className="size-3" />
            </div>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-[10px] font-bold text-white">
            MA
          </div>
          <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-xs text-slate-800 shadow-sm ring-1 ring-slate-100">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span className="size-1 animate-bounce rounded-full bg-slate-400 [animation-delay:-200ms]" />
              <span className="size-1 animate-bounce rounded-full bg-slate-400 [animation-delay:-100ms]" />
              <span className="size-1 animate-bounce rounded-full bg-slate-400" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#faf5ff,#fdf2f8)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] shadow-md shadow-violet-300/40">
                <Video className="size-4 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-slate-900">
                  IELTS Speaking Room
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  Starting in 18 min · 45 min lesson
                </p>
              </div>
            </div>
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white">
              LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-5 py-3">
        <Smile className="size-4 text-slate-400" />
        <FileText className="size-4 text-slate-400" />
        <span className="flex-1 text-xs text-slate-400">Type a message</span>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] shadow-md shadow-violet-300/40"
        >
          <Send className="size-4 text-white" />
        </button>
      </div>
    </div>
  );
}

function PricingSlide({ t }: { t: (key: string) => string }) {
  const features = [
    "First lesson free · 30 min",
    "No subscription, cancel anytime",
    "100% money-back if not satisfied",
  ];

  return (
    <div className="flex h-[460px] flex-col">
      <SlideHeader
        icon={Wallet}
        eyebrow={t("slides.pricing.eyebrow")}
        title={t("slides.pricing.title")}
        trailing={
          <span className="rounded-full border border-emerald-300/60 bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold text-emerald-100 backdrop-blur">
            Save 92%
          </span>
        }
      />

      <div className="flex-1 space-y-5 px-6 py-2">
        <div className="text-center">
          <div className="inline-flex items-baseline gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              from
            </span>
            <span className="bg-[linear-gradient(135deg,#7c3aed,#9333ea,#ec4899)] bg-clip-text text-6xl font-extrabold tracking-tighter text-transparent">
              $8
            </span>
            <span className="text-base font-bold text-slate-500">/lesson</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600">
            <span className="text-slate-400 line-through">$200/mo</span>
            <span>at language centers</span>
          </div>
        </div>

        <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#10b981,#059669)] shadow-sm">
                <CheckCircle2 className="size-3.5 text-white" />
              </div>
              <p className="text-xs font-semibold text-slate-700">{feature}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Trial",
              price: "Free",
              accent: "from-emerald-500 to-teal-500",
            },
            {
              label: "Standard",
              price: "$15",
              accent: "from-violet-500 to-fuchsia-500",
              featured: true,
            },
            {
              label: "Native",
              price: "$24",
              accent: "from-amber-500 to-rose-500",
            },
          ].map((tier) => (
            <div
              key={tier.label}
              className={`relative rounded-xl border px-3 py-2.5 text-center ${
                tier.featured
                  ? "border-violet-300 bg-violet-50/70 shadow-sm"
                  : "border-slate-100 bg-white"
              }`}
            >
              {tier.featured ? (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[linear-gradient(110deg,#7c3aed,#ec4899)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                  Popular
                </span>
              ) : null}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {tier.label}
              </p>
              <p
                className={`mt-1 text-base font-extrabold ${
                  tier.featured ? "text-violet-700" : "text-slate-900"
                }`}
              >
                {tier.price}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-[linear-gradient(180deg,#fafafa,#f8fafc)] px-6 py-3.5">
        <Button className="group h-10 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-xs font-semibold text-white shadow-md shadow-violet-300/40">
          <Zap className="mr-1.5 size-3.5" />
          Start with $0
          <ArrowRight className="ml-1 size-3 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}

function VerifiedSlide({ t }: { t: (key: string) => string }) {
  const subjects = [
    { id: "math", label: "Math", accent: "from-violet-500 to-purple-500" },
    {
      id: "languages",
      label: "Languages",
      accent: "from-purple-500 to-fuchsia-500",
    },
    { id: "science", label: "Science", accent: "from-fuchsia-500 to-rose-500" },
    { id: "coding", label: "Coding", accent: "from-rose-500 to-orange-500" },
    { id: "business", label: "Business", accent: "from-amber-500 to-rose-500" },
    { id: "music", label: "Music", accent: "from-indigo-500 to-violet-500" },
  ];

  const checks = [
    { label: "ID verified", icon: ShieldCheck },
    { label: "Interviewed", icon: CheckCircle2 },
    { label: "Reviewed", icon: Star },
  ];

  return (
    <div className="flex h-[460px] flex-col">
      <SlideHeader
        icon={ShieldCheck}
        eyebrow={t("slides.verified.eyebrow")}
        title={t("slides.verified.title")}
        trailing={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur">
            <CheckCircle2 className="size-3.5" />
            Vetted
          </span>
        }
      />

      <div className="flex-1 space-y-4 px-6 py-5">
        <div className="text-center">
          <div className="inline-flex items-baseline gap-2">
            <span className="bg-[linear-gradient(135deg,#7c3aed,#9333ea,#ec4899)] bg-clip-text text-5xl font-extrabold tracking-tighter text-transparent">
              1,200+
            </span>
            <span className="text-sm font-bold text-slate-500">
              expert tutors
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            Verified credentials · Top universities · Real-world experience
          </p>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Popular subjects
          </p>
          <div className="grid grid-cols-3 gap-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="relative overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-center shadow-sm"
              >
                <div
                  className={`pointer-events-none absolute -top-6 -right-6 size-12 rounded-full bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${subject.accent} opacity-20 blur-xl`}
                />
                <p className="relative text-sm font-extrabold text-slate-900">
                  {subject.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {checks.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#f0fdfa)] px-3 py-2"
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
                <Icon className="size-3.5" />
              </div>
              <p className="text-[10px] font-bold text-emerald-800">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-[linear-gradient(180deg,#fafafa,#f8fafc)] px-6 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="leading-tight">
            <p className="text-xs font-bold text-slate-900">
              Hand-picked, every week
            </p>
            <p className="text-[11px] text-slate-500">
              Less than 8% of applicants pass
            </p>
          </div>
          <Button
            variant="outline"
            className="h-9 shrink-0 rounded-full border-violet-200 px-4 text-xs font-semibold text-violet-700 hover:bg-violet-50"
          >
            How we vet
          </Button>
        </div>
      </div>
    </div>
  );
}
