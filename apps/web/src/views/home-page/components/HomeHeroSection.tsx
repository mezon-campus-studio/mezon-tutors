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
  PlayCircle,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Video,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge, Button } from "@/components/ui";

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
    <section className="relative overflow-hidden pt-12 pb-28 sm:pt-16 lg:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/35 blur-[140px]" />
        <div className="absolute -top-20 right-0 size-[32rem] rounded-full bg-fuchsia-200/40 blur-[120px]" />
        <div className="absolute top-1/3 -left-20 size-[28rem] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(108 92 231) 1px, transparent 0)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-12 lg:px-10">
        <div className="space-y-7">
          <Badge className="h-auto rounded-full border border-violet-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/50 backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Sparkles className="mr-1.5 size-3.5" />
            {t("badge")}
          </Badge>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:text-5xl lg:text-5xl xl:text-[3.6rem]">
            {t("title")}
            <br />
            <span className="relative inline-block pb-1">
              <span className="relative z-10 bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
              <svg
                className="absolute -bottom-1 left-0 z-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                preserveAspectRatio="none"
                role="presentation"
              >
                <path
                  d="M2 8 C 80 2, 180 2, 298 8"
                  stroke="url(#hero-underline)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <defs>
                  <linearGradient
                    id="hero-underline"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          <p className="max-w-xl text-base leading-7 text-slate-600 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:120ms] [animation-fill-mode:both] sm:text-lg sm:leading-8">
            {t("description")}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:240ms] [animation-fill-mode:both]">
            <Link href="/tutors">
              <Button className="group h-12 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] px-7 text-sm font-semibold text-white shadow-lg shadow-violet-300/50 transition-all hover:shadow-xl hover:shadow-violet-400/50">
                {t("startNow")}
                <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="h-12 rounded-full px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              <PlayCircle className="mr-1.5 size-5 text-violet-600" />
              {t("watchDemo")}
            </Button>
          </div>

          <div className="flex items-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:360ms] [animation-fill-mode:both]">
            <div className="flex -space-x-2.5">
              {TRUST_AVATARS.map((avatar) => (
                <div
                  key={avatar.id}
                  className={`flex size-9 items-center justify-center rounded-full border-[2.5px] border-white bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${avatar.gradient} text-[11px] font-bold text-white shadow-sm`}
                >
                  {avatar.initials}
                </div>
              ))}
              <div className="flex size-9 items-center justify-center rounded-full border-[2.5px] border-white bg-violet-100 text-[10px] font-bold text-violet-700 shadow-sm">
                +25k
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-0.5">
                {["s1", "s2", "s3", "s4", "s5"].map((id) => (
                  <Star
                    key={id}
                    className="size-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
                <span className="ml-1 text-xs font-bold text-slate-900">
                  4.9
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                {t("trust")}
              </p>
            </div>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 [animation-delay:120ms] [animation-fill-mode:both]">
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

      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white shadow-[0_12px_32px_-18px_rgba(91,33,182,0.2)]">
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

      <div className="flex-1 space-y-5 px-6 py-6">
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
    { id: "languages", label: "Languages", accent: "from-purple-500 to-fuchsia-500" },
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
