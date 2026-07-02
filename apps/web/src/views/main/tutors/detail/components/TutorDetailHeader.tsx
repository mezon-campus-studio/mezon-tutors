"use client";

import type { TutorAboutDto } from "@mezon-tutors/shared";
import { ROUTES } from "@mezon-tutors/shared";
import {
  Calendar,
  CalendarRange,
  CreditCard,
  Flame,
  GraduationCap,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ReactGA from "react-ga4";
import { Button } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SaveTutorButton } from "../../components/SaveTutorButton";
import { useTutorBooking } from "../hooks/TutorBookingContext";
import { TutorProfileTags } from "./TutorProfileTags";

type TutorDetailHeaderProps = {
  tutor: TutorAboutDto;
};

function StatItem({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Flame;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 sm:px-6">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900 sm:text-base">
          {title}
        </p>
        <p className="truncate text-xs text-gray-500 sm:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

export function TutorDetailHeader({ tutor }: TutorDetailHeaderProps) {
  const t = useTranslations("Tutors.Detail");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const booking = useTutorBooking();
  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const isHighDemand = tutor.stats.bookedLessonsLast48h >= 3;

  return (
    <section className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 gap-4 sm:gap-5">
            <Image
              src={tutor.avatar}
              alt={name}
              width={96}
              height={96}
              priority
              className="size-20 shrink-0 rounded-full object-cover object-center ring-2 ring-violet-100 sm:size-24"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  {name}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                  <GraduationCap className="size-3.5" />
                  {tSubject(tutor.subject)}
                </span>
              </div>

              <div className="mt-3">
                <TutorProfileTags tutor={tutor} showSubject={false} />
              </div>
            </div>
          </div>

          {!booking.isOwnProfile ? (
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[220px] lg:items-end lg:pt-1">
              {booking.showContinuePayment && booking.pendingPayment ? (
                <Button
                  className="h-11 w-full rounded-full text-sm font-semibold lg:w-auto"
                  variant="gradient"
                  onClick={() => booking.handleBookLesson()}
                >
                  <CreditCard className="mr-1.5 size-4" />
                  {t("continuePayment")}
                </Button>
              ) : booking.showBusyBadge ? (
                <span className="inline-flex h-11 w-full items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-5 text-center text-sm font-semibold text-amber-800 lg:w-auto">
                  {t("temporarilyBusy")}
                </span>
              ) : booking.showBookTrial ? (
                <Button
                  variant="gradient"
                  disabled={booking.bookTrialDisabled}
                  title={
                    booking.bookTrialDisabled
                      ? t("bookTrialDisabledHint")
                      : undefined
                  }
                  className="h-11 w-full rounded-full px-5 text-sm font-semibold lg:w-auto"
                  onClick={() => {
                    ReactGA.event("view_schedule_click", { tutor_id: tutor.id });
                    booking.setIsTrialBookingSheetOpen(true);
                  }}
                >
                  <Calendar className="mr-1.5 size-4" />
                  {t("bookTrial")}
                </Button>
              ) : null}

              {booking.showSubscribe ? (
                <div className="flex w-full flex-col gap-2">
                  <Link
                    href={`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutor.id)}`}
                    className={cn(
                      buttonVariants({ variant: "gradient" }),
                      "h-11 w-full rounded-full text-sm font-semibold lg:w-full",
                    )}
                    onClick={() => {
                      ReactGA.event("view_schedule_click", { tutor_id: tutor.id });
                    }}
                  >
                    <CalendarRange className="mr-1.5 size-4" />
                    {t("subscribeMonthly")}
                  </Link>
                  <Link
                    href={`${ROUTES.DASHBOARD.GROUPS}?tutorId=${tutor.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-11 w-full rounded-full border-violet-200 text-sm font-semibold text-violet-800 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900 lg:w-full",
                    )}
                    onClick={() => {
                      ReactGA.event("view_schedule_click", { tutor_id: tutor.id });
                    }}
                  >
                    <Users className="mr-1.5 size-4" />
                    {t("subscribeGroup")}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-gray-100">
          <div className="flex flex-col divide-y divide-gray-100 sm:flex-row sm:divide-x sm:divide-y-0">
            {!booking.isOwnProfile ? (
              <SaveTutorButton
                layout="stat"
                tutorId={tutor.id}
                isSaved={tutor.isSaved}
                saveLabel={t("favoriteTeacher")}
                savedLabel={t("favoriteTeacherSaved")}
                statSubtitle={t("statsFavoriteHint")}
                statSavedSubtitle={t("statsFavoriteSavedHint")}
              />
            ) : null}

            <StatItem
              icon={Flame}
              title={
                isHighDemand
                  ? t("highDemand")
                  : t("bookedLast48h", {
                      count: tutor.stats.bookedLessonsLast48h,
                    })
              }
              subtitle={
                isHighDemand ? t("topBookedRecently") : t("statsRecentBookings")
              }
            />

            <StatItem
              icon={Video}
              title={tutor.stats.totalLessonsTaught.toLocaleString()}
              subtitle={t("statsTotalLessons")}
            />

            <StatItem
              icon={Users}
              title={tutor.stats.totalStudents.toLocaleString()}
              subtitle={t("statsTotalStudents")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
