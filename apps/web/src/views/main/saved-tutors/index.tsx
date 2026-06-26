"use client";

import { ROUTES, type VerifiedTutorProfileDto } from "@mezon-tutors/shared";
import { Bookmark, GraduationCap, Search, Sparkles, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { useGetSavedTutors } from "@/services";
import TutorCard from "../tutors/components/TutorCard";

function LoadingCards() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} className="overflow-hidden border-violet-100 py-0 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
            <Skeleton className="size-28 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SavedTutorMetrics({
  total,
  topRated,
  proCount,
  isLoading,
}: {
  total: number;
  topRated: number;
  proCount: number;
  isLoading: boolean;
}) {
  const t = useTranslations("Dashboard.savedTutors.metrics");

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  const items = [
    {
      label: t("total"),
      value: total,
      icon: Bookmark,
      accent: "from-violet-500 to-purple-500",
      bg: "bg-violet-50",
      text: "text-violet-700",
    },
    {
      label: t("topRated"),
      value: topRated,
      icon: Star,
      accent: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
    },
    {
      label: t("professional"),
      value: proCount,
      icon: GraduationCap,
      accent: "from-fuchsia-500 to-rose-500",
      bg: "bg-fuchsia-50",
      text: "text-fuchsia-700",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.label}
            className="relative min-w-0 overflow-hidden border-violet-100 shadow-sm shadow-violet-100/30"
          >
            <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`} />
            <CardContent className="flex flex-col gap-1.5 p-3 sm:p-4">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {item.label}
                </p>
              </div>
              <div className="flex items-end justify-between gap-1">
                <p className="text-2xl font-extrabold text-slate-900">
                  {item.value}
                </p>
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.text}`}
                >
                  <Icon className="size-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function SavedTutorsView() {
  const t = useTranslations("Dashboard.savedTutors");
  const router = useRouter();
  const { data, isLoading, isError } = useGetSavedTutors();
  const tutors = data ?? [];
  const topRated = tutors.filter((tutor) => tutor.ratingAverage >= 4.5).length;
  const proCount = tutors.filter((tutor) => tutor.isProfessional).length;

  const openTutor = (tutor: VerifiedTutorProfileDto) => {
    router.push(ROUTES.TUTOR.DETAIL(tutor.id));
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50">
      <div className="pointer-events-none fixed inset-x-0 top-16 -z-10 h-72 bg-[linear-gradient(180deg,#faf5ff_0%,#f8fafc_100%)]" />
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-5 md:gap-6">
          <header className="flex flex-col gap-4 rounded-3xl border border-violet-100 bg-white/85 p-5 shadow-sm shadow-violet-100/40 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
                <Bookmark className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                  {t("eyebrow")}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                  {t("title")}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  {t("subtitle")}
                </p>
              </div>
            </div>

            <Button
              variant="gradient"
              className="h-11 shrink-0 rounded-full px-5 text-sm font-semibold shadow-md shadow-violet-300/35"
              onClick={() => router.push(ROUTES.TUTOR.INDEX)}
            >
              <Search className="mr-1.5 size-4" />
              {t("browseTutors")}
            </Button>
          </header>

          <SavedTutorMetrics
            total={tutors.length}
            topRated={topRated}
            proCount={proCount}
            isLoading={isLoading}
          />

          <Card className="min-w-0 border-violet-100 bg-white/90 shadow-sm shadow-violet-100/30">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">
                    {t("listEyebrow")}
                  </p>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {t("listTitle", { count: tutors.length })}
                  </h2>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  {t("listHint")}
                </p>
              </div>

              {isLoading ? <LoadingCards /> : null}

              {!isLoading && isError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-8 text-center text-sm font-medium text-rose-700">
                  {t("loadError")}
                </div>
              ) : null}

              {!isLoading && !isError && tutors.length === 0 ? (
                <div className="flex flex-col items-center rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf8ff_0%,#ffffff_100%)] px-4 py-12 text-center sm:py-14">
                  <div className="relative mb-5">
                    <div className="absolute inset-0 rounded-3xl bg-violet-200/50 blur-2xl" />
                    <div className="relative flex size-16 items-center justify-center rounded-3xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                      <Sparkles className="size-7" />
                    </div>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {t("emptyTitle")}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                    {t("emptyDescription")}
                  </p>
                  <Button
                    variant="gradient"
                    className="mt-6 h-10 rounded-full px-5 shadow-md shadow-violet-300/35"
                    onClick={() => router.push(ROUTES.TUTOR.INDEX)}
                  >
                    <Search className="mr-1.5 size-4" />
                    {t("browseTutors")}
                  </Button>
                </div>
              ) : null}

              {!isLoading && !isError && tutors.length > 0 ? (
                <section className="space-y-4">
                  {tutors.map((tutor) => (
                    <TutorCard
                      key={tutor.id}
                      tutor={tutor}
                      onSelectAction={openTutor}
                    />
                  ))}
                </section>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
