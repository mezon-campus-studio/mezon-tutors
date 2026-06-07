"use client";

import { ROUTES } from "@mezon-tutors/shared";
import { CalendarDays, CheckCircle2, Home, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export default function CreateEventSuccessPage() {
  const t = useTranslations("Events.create.successPage");

  return (
    <main className="relative min-h-[70vh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_55%,#fdf4ff_100%)]" />
        <div className="absolute -top-24 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-violet-300/25 blur-[120px]" />
        <div className="absolute right-0 bottom-0 size-[28rem] rounded-full bg-fuchsia-200/30 blur-[100px]" />
      </div>

      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center sm:py-24">
        <div className="relative">
          <div className="absolute inset-0 scale-150 rounded-full bg-emerald-200/40 blur-2xl" />
          <div className="relative flex size-20 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#10b981,#34d399)] text-white shadow-xl shadow-emerald-300/40">
            <CheckCircle2 className="size-10" strokeWidth={2.25} />
          </div>
        </div>

        <p className="mt-8 text-[10px] font-bold tracking-[0.25em] text-violet-600 uppercase">
          {t("badge")}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
          {t("description")}
        </p>
        <p className="mt-3 max-w-md text-xs leading-6 text-slate-500">{t("hint")}</p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link href={ROUTES.DASHBOARD.MY_EVENTS} className="w-full sm:w-auto">
            <Button
              variant="gradient"
              className="h-11 w-full rounded-full px-8 text-sm font-semibold shadow-lg shadow-violet-300/30"
            >
              <CalendarDays className="mr-2 size-4" />
              {t("myEvents")}
            </Button>
          </Link>
          <Link href={ROUTES.EVENTS.CREATE} className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-11 w-full rounded-full border-violet-200 px-8 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            >
              <Plus className="mr-2 size-4" />
              {t("createAnother")}
            </Button>
          </Link>
        </div>

        <Link
          href={ROUTES.HOME.index}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
        >
          <Home className="size-4" />
          {t("backToEvents")}
        </Link>
      </div>
    </main>
  );
}
