"use client";

import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  Compass,
  GraduationCap,
  MessageCircle,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { formatTutorNextLessonLabel } from "@/components/calendar/utils/format-locale";
import type { TutorItem } from "@/services/my-lessons/my-lessons.api";

type TutorCardProps = {
  tutor: TutorItem;
  onOpenTutor: (tutorId: string) => void;
};

function TutorCard({ tutor, onOpenTutor }: TutorCardProps) {
  const t = useTranslations("MyLessons");
  const locale = useLocale();
  const displayNextLesson = tutor.nextLessonLabel
    ? formatTutorNextLessonLabel(tutor.nextLessonLabel, locale)
    : t("panels.tutors.unscheduled");

  return (
    <div className="group flex w-full flex-col gap-4 rounded-2xl border border-violet-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40 sm:flex-row sm:items-center sm:gap-5">
      <button
        type="button"
        onClick={() => onOpenTutor(tutor.id)}
        className="flex flex-1 cursor-pointer items-start gap-4 text-left"
      >
        <div className="relative shrink-0">
          <Image
            src={tutor.avatar}
            alt={tutor.name}
            width={80}
            height={80}
            className="size-16 rounded-2xl object-cover ring-2 ring-white shadow-sm shadow-violet-200/40 sm:size-20"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h3 className="truncate text-base font-extrabold text-slate-900 transition-colors group-hover:text-violet-700 sm:text-lg">
              {tutor.name}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
              <GraduationCap className="size-3" />
              {tutor.teaches}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  {t("panels.tutors.completed")}
                </p>
                <p className="text-xs font-extrabold text-emerald-900">
                  {t("panels.tutors.lessonsCount", {
                    count: tutor.completedLessons,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-3 py-1.5">
              <CalendarPlus className="size-3.5 text-violet-600" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  {t("panels.tutors.nextLesson")}
                </p>
                <p className="text-xs font-extrabold text-violet-900">
                  {displayNextLesson}
                </p>
              </div>
            </div>
          </div>
        </div>
      </button>

      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600 ring-1 ring-amber-100 sm:self-end">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          {tutor.ratingAverage.toFixed(1)}
          <span className="text-[10px] font-medium text-amber-500/80">
            · {t("panels.tutors.reviewCount", { count: tutor.reviewCount })}
          </span>
        </span>

        <div className="flex gap-2">
          <Button className="group/btn h-9 flex-1 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-4 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 sm:flex-none sm:min-w-28">
            <CalendarPlus className="mr-1 size-3.5" />
            {t("panels.tutors.schedule")}
          </Button>
          <Button
            variant="outline"
            className="h-9 flex-1 rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 sm:flex-none sm:min-w-28"
          >
            <MessageCircle className="mr-1 size-3.5" />
            {t("panels.tutors.message")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DiscoverCard() {
  const t = useTranslations("MyLessons");
  const router = useRouter();

  return (
    <div className="relative mt-2 overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-8">
      <div className="pointer-events-none absolute -top-12 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-xl" />
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
            <Compass className="size-5" />
          </div>
        </div>

        <h3 className="max-w-lg text-balance text-xl font-extrabold text-slate-900 sm:text-2xl">
          {t("panels.tutors.discoverTitle")}
        </h3>
        <p className="max-w-md text-sm text-slate-600">
          {t("panels.tutors.discoverDescription")}
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => router.push("/tutors")}
            className="group h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
          >
            <Sparkles className="mr-1.5 size-3.5" />
            {t("panels.tutors.findTutors")}
            <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/tutors")}
            className="h-10 rounded-full border-slate-200 px-5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            {t("panels.tutors.viewSubjects")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type MyTutorsPanelProps = {
  tutors: TutorItem[];
};

export default function MyTutorsPanel({ tutors }: MyTutorsPanelProps) {
  const t = useTranslations("MyLessons");
  const router = useRouter();

  const handleOpenTutor = (tutorId: string) => {
    router.push(`/tutors/${tutorId}`);
  };

  return (
    <div className="flex w-full max-w-[1032px] flex-col gap-5">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
              {t("panels.tutors.eyebrow", { defaultValue: "My tutors" })}
            </p>
            <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
              {t("panels.tutors.title")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("panels.tutors.subtitle", { count: tutors.length })}
            </p>
          </div>
        </div>

        <Button
          onClick={() => router.push("/tutors")}
          className="group h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
        >
          <Plus className="mr-1 size-3.5" />
          {t("panels.tutors.findNewTutors")}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {tutors.map((tutor) => (
          <TutorCard
            key={tutor.id}
            tutor={tutor}
            onOpenTutor={handleOpenTutor}
          />
        ))}
      </div>

      <DiscoverCard />
    </div>
  );
}
