"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  BookOpen,
  Compass,
  GraduationCap,
  Home,
  Search,
  Sparkles,
} from "lucide-react";
import { ROUTES } from "@mezon-tutors/shared";
import { Button } from "@/components/ui/button";

const ORBIT_ITEMS = [
  { Icon: BookOpen, delay: "0s", duration: "18s" },
  { Icon: GraduationCap, delay: "-4s", duration: "22s" },
  { Icon: Compass, delay: "-8s", duration: "16s" },
  { Icon: Sparkles, delay: "-12s", duration: "20s" },
] as const;

export default function NotFoundPage() {
  const t = useTranslations("Common.NotFound");
  const pathname = usePathname();

  return (
    <section className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden px-6 py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#f5f0ff_0%,#faf8ff_35%,#ffffff_72%,#fffdfd_100%)]" />
        <div
          className="absolute -top-32 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-400/40 via-fuchsia-300/30 to-transparent blur-[120px] motion-reduce:animate-none [animation:hero-blob-drift_22s_ease-in-out_infinite]"
          style={{ animationDelay: "-3s" }}
        />
        <div
          className="absolute -bottom-20 -right-24 size-[32rem] rounded-full bg-gradient-to-tl from-rose-300/30 via-violet-200/35 to-transparent blur-[100px] motion-reduce:animate-none [animation:hero-blob-drift_18s_ease-in-out_infinite]"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(108 92 231) 1px, transparent 0)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <div className="relative mb-10 flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64">
          {ORBIT_ITEMS.map(({ Icon, delay, duration }, index) => (
            <div
              key={index}
              className="absolute inset-0 motion-reduce:animate-none"
              style={{
                animation: `not-found-orbit ${duration} linear infinite`,
                animationDelay: delay,
              }}
            >
              <span className="absolute left-1/2 top-0 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-violet-600 shadow-lg shadow-violet-200/40 ring-1 ring-violet-100 backdrop-blur-sm">
                <Icon className="size-5" />
              </span>
            </div>
          ))}

          <div className="relative z-10 flex items-center gap-1 sm:gap-2">
            <span
              className="select-none text-brand-gradient text-[5.5rem] font-black leading-none tracking-tighter drop-shadow-sm sm:text-[7rem] motion-safe:[animation:not-found-digit-bob_4s_ease-in-out_infinite]"
              style={{ animationDelay: "0s" }}
            >
              4
            </span>
            <div
              className="relative flex size-[5.5rem] items-center justify-center sm:size-[7rem] motion-safe:[animation:not-found-digit-bob_4s_ease-in-out_infinite]"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] shadow-[0_20px_60px_-20px_rgba(124,58,237,0.45)] ring-1 ring-violet-200/60" />
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-violet-300/60 motion-safe:[animation:not-found-spin_12s_linear_infinite]" />
              <Compass className="relative size-10 text-violet-600 sm:size-12 motion-safe:[animation:not-found-compass_6s_ease-in-out_infinite]" />
            </div>
            <span
              className="select-none text-brand-gradient text-[5.5rem] font-black leading-none tracking-tighter drop-shadow-sm sm:text-[7rem] motion-safe:[animation:not-found-digit-bob_4s_ease-in-out_infinite]"
              style={{ animationDelay: "0.6s" }}
            >
              4
            </span>
          </div>
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur-sm">
          <Sparkles className="size-3.5" />
          {t("badge")}
        </div>

        <h1 className="max-w-xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
          {t("title")}
        </h1>

        <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
          {t("description")}
        </p>

        {pathname && pathname !== "/" ? (
          <p className="mt-3 max-w-md truncate rounded-xl border border-violet-200/60 bg-white/60 px-4 py-2 font-mono text-sm font-medium backdrop-blur-sm">
            <span className="text-brand-gradient">
              {pathname}
            </span>
          </p>
        ) : null}

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link href={ROUTES.HOME.index} className="inline-flex">
            <Button variant="gradient" size="lg">
              <Home data-icon="inline-start" />
              {t("goHome")}
            </Button>
          </Link>
          <Link href={ROUTES.TUTOR.INDEX} className="inline-flex">
            <Button variant="outline" size="lg">
              <Search data-icon="inline-start" />
              {t("findTutors")}
            </Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="group cursor-pointer mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-600"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          {t("goBack")}
        </button>
      </div>
    </section>
  );
}
