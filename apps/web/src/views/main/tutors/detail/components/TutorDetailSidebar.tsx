"use client";

import {
  ECurrency,
  formatToCurrency,
  type TutorAboutDto,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import {
  Calendar,
  type CheckCircle2,
  MessageCircle,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useCurrency } from "@/hooks";
import { userAtom } from "@/store/auth.atom";
import { TrialBookingSheet } from "../../components/TrialBookingSheet";
import { TutorMessageModal } from "../../components/TutorMessageModal";

type TutorDetailSidebarProps = {
  tutor: TutorAboutDto;
};

export function TutorDetailSidebar({ tutor }: TutorDetailSidebarProps) {
  const t = useTranslations("Tutors.Detail");
  const { currency } = useCurrency();
  const currentUser = useAtomValue(userAtom);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isTrialBookingSheetOpen, setIsTrialBookingSheetOpen] = useState(false);

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const studentId = currentUser?.id;
  const studentMezonUserId = currentUser?.mezonUserId;
  const tutorId = tutor.userId;

  const lessonPrice =
    currency === ECurrency.USD
      ? tutor.prices.usd
      : currency === ECurrency.PHP
        ? tutor.prices.php
        : tutor.prices.vnd;

  return (
    <>
      <div className="sticky top-24 flex flex-col gap-4">
        <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#6d28d9_0%,#9333ea_45%,#db2777_100%)] px-5 py-5 text-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "16px 16px",
              }}
            />
            <div className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full bg-white/15 blur-2xl" />

            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                Trial lesson
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold">
                  {formatToCurrency(currency, lessonPrice)}
                </span>
                <span className="text-xs font-medium text-white/80">
                  {t("perLesson")}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 p-5">
            <Button
              onClick={() => setIsTrialBookingSheetOpen(true)}
              className="group h-11 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
            >
              <Calendar className="mr-1.5 size-4" />
              {t("bookTrial")}
            </Button>

            <Button
              variant="outline"
              disabled={!studentId}
              onClick={() => setIsMessageModalOpen(true)}
              className="h-11 w-full rounded-full border-slate-200 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              <MessageCircle className="mr-1.5 size-4" />
              {t("sendMessage")}
            </Button>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <SidebarStat
                icon={Calendar}
                accent="from-violet-500 to-purple-500"
                label={t("bookedLast48h", {
                  count: tutor.stats.bookedLessonsLast48h,
                })}
              />
              <SidebarStat
                icon={Users}
                accent="from-purple-500 to-fuchsia-500"
                label={t("totalStudents", {
                  count: tutor.stats.totalStudents,
                })}
              />
              <SidebarStat
                icon={Video}
                accent="from-fuchsia-500 to-rose-500"
                label={t("totalLessons", {
                  count: tutor.stats.totalLessonsTaught,
                })}
              />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-violet-200 bg-[linear-gradient(135deg,#faf5ff,#fdf2f8)] p-5">
          <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.25),transparent_70%)] blur-2xl" />
          <div className="relative space-y-3">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
              <Sparkles className="size-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {t("promoTitle")}
            </h3>
            <p className="text-xs leading-5 text-slate-600">
              {t("promoDescription")}
            </p>
            <Button className="group h-9 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50">
              {t("promoAction")}
            </Button>
          </div>
        </div>
      </div>

      <TutorMessageModal
        open={isMessageModalOpen}
        tutorFirstName={tutor.firstName}
        studentId={studentId ?? ""}
        studentMezonUserId={studentMezonUserId}
        tutorId={tutorId}
        tutorMezonUserId={tutor.mezonUserId}
        onOpenChangeAction={setIsMessageModalOpen}
      />

      <TrialBookingSheet
        open={isTrialBookingSheetOpen}
        onOpenChange={setIsTrialBookingSheetOpen}
        tutor={{
          id: tutor.id,
          name,
          title: tutor.subject,
          prices: tutor.prices,
          avatar: tutor.avatar,
        }}
      />
    </>
  );
}

function SidebarStat({
  icon: Icon,
  accent,
  label,
}: {
  icon: typeof CheckCircle2;
  accent: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}
      >
        <Icon className="size-3.5" />
      </div>
      <span className="text-xs leading-5 text-slate-700">{label}</span>
    </div>
  );
}
