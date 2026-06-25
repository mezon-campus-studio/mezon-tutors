"use client";

import {
  ECurrency,
  formatToCurrency,
  ROUTES,
  type TutorAboutDto,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import {
  Calendar,
  CalendarRange,
  type CheckCircle2,
  CreditCard,
  MessageCircle,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import {
  continueTutorPendingPayment,
  useCurrency,
  useTutorPendingPayment,
  useUserTimezone,
} from "@/hooks";
import { useGetSubscriptionEligibility, useGetSubscriptionPlansByTutor } from "@/services";
import { userAtom } from "@/store/auth.atom";
import { TrialBookingSheet } from "../../components/TrialBookingSheet";
import { SendMessageModal } from "@/components/common/SendMessageModal";
import { cn } from "@/lib/utils";
import { SaveTutorButton } from "../../components/SaveTutorButton";

type TutorDetailSidebarProps = {
  tutor: TutorAboutDto;
};

export function TutorDetailSidebar({ tutor }: TutorDetailSidebarProps) {
  const t = useTranslations("Tutors.Detail");
  const { currency } = useCurrency();
  const userTimezone = useUserTimezone();
  const currentUser = useAtomValue(userAtom);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isTrialBookingSheetOpen, setIsTrialBookingSheetOpen] = useState(false);

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const senderId = currentUser?.id;
  const senderMezonUserId = currentUser?.mezonUserId;
  const recipientId = tutor.userId;
  const isOwnProfile = Boolean(senderId && senderId === tutor.userId);
  const canFetchSub = Boolean(senderId && !isOwnProfile);
  const { data: elig, isPending: eligPending } = useGetSubscriptionEligibility(tutor.id, canFetchSub);
  const { data: subscriptionPlans } = useGetSubscriptionPlansByTutor(tutor.id, canFetchSub);
  const { pendingPayment } = useTutorPendingPayment(tutor.id, canFetchSub);
  const hasSubscriptionPlans = Boolean(subscriptionPlans?.length);
  const trialDone =
    elig?.trialStatus === "COMPLETED" && elig?.trialPaymentStatus === "SUCCEEDED";
  const showContinuePayment = canFetchSub && Boolean(pendingPayment);
  const showMonthlyActions = tutor.activeStatus !== false;
  const isTutorTemporarilyBusy = !isOwnProfile && tutor.activeStatus === false;
  const wouldShowSubscribeIfActive =
    canFetchSub &&
    !showContinuePayment &&
    trialDone &&
    hasSubscriptionPlans &&
    elig?.reason !== "ALREADY_ENROLLED";
  const wouldShowBookTrialIfActive =
    !isOwnProfile && (!senderId || !trialDone) && !showContinuePayment;
  const showSubscribe = showMonthlyActions && wouldShowSubscribeIfActive;
  const showBookTrial = showMonthlyActions && wouldShowBookTrialIfActive;
  const showBusyBadge =
    isTutorTemporarilyBusy &&
    !showContinuePayment &&
    (wouldShowBookTrialIfActive || wouldShowSubscribeIfActive);
  const bookTrialDisabled =
    canFetchSub &&
    (eligPending || (elig?.trialStatus != null && elig.trialStatus !== "COMPLETED"));

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
            {!isOwnProfile ? (
              <SaveTutorButton
                tutorId={tutor.id}
                isSaved={tutor.isSaved}
                className="h-11 w-full"
              />
            ) : null}

            {showContinuePayment && pendingPayment ? (
              <Button
                onClick={() => continueTutorPendingPayment(pendingPayment, userTimezone)}
                className="group h-11 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
              >
                <CreditCard className="mr-1.5 size-4" />
                {t("continuePayment")}
              </Button>
            ) : showBusyBadge ? (
              <span className="inline-flex h-11 w-full items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 text-center text-sm font-semibold text-amber-800">
                {t("temporarilyBusy")}
              </span>
            ) : showBookTrial ? (
              <Button
                disabled={bookTrialDisabled}
                title={bookTrialDisabled ? t("bookTrialDisabledHint") : undefined}
                onClick={() => setIsTrialBookingSheetOpen(true)}
                className="group h-11 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
              >
                <Calendar className="mr-1.5 size-4" />
                {t("bookTrial")}
              </Button>
            ) : null}

            {showSubscribe ? (
              <>
                <Link
                  href={`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutor.id)}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 w-full rounded-full border-violet-200 text-sm font-semibold text-violet-800 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900",
                  )}
                >
                  <CalendarRange className="mr-1.5 size-4" />
                  {t("subscribeMonthly")}
                </Link>
                <Link
                  href={`${ROUTES.DASHBOARD.GROUPS}?tutorId=${tutor.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 w-full rounded-full border-violet-200 text-sm font-semibold text-violet-800 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900",
                  )}
                >
                  <Users className="mr-1.5 size-4" />
                  {t("subscribeGroup")}
                </Link>
              </>
            ) : null}

            <Button
              variant="outline"
              disabled={!senderId}
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

        
      </div>

      <SendMessageModal
        open={isMessageModalOpen}
        title={tutor.firstName}
        senderId={senderId ?? ''}
        senderMezonUserId={senderMezonUserId ?? ''}
        recipientId={recipientId}
        recipientMezonUserId={tutor.mezonUserId}
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
