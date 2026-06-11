"use client";

import {
  ECurrency,
  formatToCurrency,
  ROUTES,
  type VerifiedTutorProfileDto,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import {
  BadgeCheck,
  Calendar,
  CalendarRange,
  CreditCard,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card, CardContent } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import {
  continueTutorPendingPayment,
  useCurrency,
  useTutorPendingPayment,
  useUserTimezone,
} from "@/hooks";
import { useGetSubscriptionEligibility, useGetSubscriptionPlansByTutor } from "@/services";
import { userAtom } from "@/store/auth.atom";
import { TrialBookingSheet } from "./TrialBookingSheet";
import { SendMessageModal } from "@/components/common/SendMessageModal";
import { cn } from "@/lib/utils";

type TutorCardProps = {
  tutor: VerifiedTutorProfileDto;
  isActive?: boolean;
  onHoverAction?: (tutor: VerifiedTutorProfileDto) => void;
  onSelectAction?: (tutor: VerifiedTutorProfileDto) => void;
};

export default function TutorCard({
  tutor,
  isActive = false,
  onHoverAction,
  onSelectAction,
}: TutorCardProps) {
  const t = useTranslations("Tutors.TutorCard");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tCountry = useTranslations("Tutors.Filter.Country");
  const tLanguage = useTranslations("Tutors.Filter.Language");
  const { currency } = useCurrency();
  const userTimezone = useUserTimezone();
  const currentUser = useAtomValue(userAtom);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isTrialBookingSheetOpen, setIsTrialBookingSheetOpen] = useState(false);

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const senderId = currentUser?.id ?? '';
  const senderMezonUserId = currentUser?.mezonUserId;
  const recipientId = tutor.userId;
  const isOwnProfile = Boolean(currentUser?.id && currentUser.id === tutor.userId);
  const canFetchSub = Boolean(currentUser?.id && !isOwnProfile);
  const { data: elig, isPending: eligPending } = useGetSubscriptionEligibility(tutor.id, canFetchSub);
  const { data: subscriptionPlans } = useGetSubscriptionPlansByTutor(tutor.id, canFetchSub);
  const { pendingPayment } = useTutorPendingPayment(tutor.id, canFetchSub);
  const hasSubscriptionPlans = Boolean(subscriptionPlans?.length);
  const trialDone =
    elig?.trialStatus === "COMPLETED" && elig?.trialPaymentStatus === "SUCCEEDED";
  const showContinuePayment = canFetchSub && Boolean(pendingPayment);
  const showSubscribe =
    canFetchSub &&
    !showContinuePayment &&
    trialDone &&
    hasSubscriptionPlans &&
    elig?.reason !== "ALREADY_ENROLLED";
  const showBookTrial =
    !isOwnProfile && (!currentUser?.id || !trialDone) && !showContinuePayment;
  const bookTrialDisabled =
    canFetchSub &&
    (eligPending || (elig?.trialStatus != null && elig.trialStatus !== "COMPLETED"));

  const tutorPrices = (
    tutor as unknown as {
      prices?: {
        baseCurrency?: ECurrency;
        usd?: number;
        vnd?: number;
        php?: number;
      };
    }
  ).prices;
  const lessonPrice =
    currency === ECurrency.USD
      ? (tutorPrices?.usd ?? 0)
      : currency === ECurrency.PHP
        ? (tutorPrices?.php ?? 0)
        : (tutorPrices?.vnd ?? 0);

  return (
    <>
      <Card
        className={`group relative overflow-hidden py-0 cursor-pointer transition-all duration-300 ${
          isActive
            ? "border-violet-300 shadow-lg shadow-violet-200/40 ring-2 ring-violet-200/60"
            : "border-slate-100 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40"
        }`}
        onMouseEnter={() => onHoverAction?.(tutor)}
        onClick={() => onSelectAction?.(tutor)}
      >
        {isActive ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,#7c3aed,#ec4899)]" />
        ) : null}

        <CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-stretch md:gap-6">
          <div className="flex flex-1 items-start gap-4">
            <div className="relative shrink-0">
              <Image
                src={tutor.avatar}
                alt={name}
                width={140}
                height={140}
                className="aspect-square size-28 rounded-2xl object-cover object-center shadow-sm md:size-36"
              />
              {tutor.isProfessional ? (
                <div className="absolute -bottom-1.5 -right-1.5 flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] px-2 py-0.5 text-[10px] font-bold text-white shadow-md shadow-violet-300/40">
                  <BadgeCheck className="size-3" strokeWidth={3} />
                  Pro
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 transition-colors group-hover:text-violet-700 md:text-2xl">
                  {name}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700 ring-1 ring-violet-100">
                  <GraduationCap className="size-3.5" />
                  {tSubject(tutor.subject)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2.5 py-1 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100">
                  <MapPin className="size-3.5" />
                  {tCountry(tutor.country)}
                </span>
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Languages className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                <span className="leading-5">
                  <span className="font-semibold text-slate-700">
                    {t("speaks", { languages: "" }).replace(":", "")}
                  </span>
                  {tutor.languages.map((language, idx) => (
                    <span key={language.languageCode}>
                      {idx > 0 ? ", " : " "}
                      <span className="font-medium text-slate-700">
                        {tLanguage(language.languageCode as unknown as string)}
                      </span>
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                        {t(`proficiency.${language.proficiency}`)}
                      </span>
                    </span>
                  ))}
                </span>
              </div>

              <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                {tutor.introduce}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-4 md:w-56 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <div className="flex items-baseline gap-1.5">
              <Star
                className="size-5 fill-amber-400 text-amber-400"
                strokeWidth={0}
              />
              <span className="text-2xl font-extrabold text-slate-900">
                {tutor.ratingAverage.toFixed(1)}
              </span>
              <span className="text-xs font-medium text-slate-400">/ 5.0</span>
            </div>

            <div className="-mt-1 flex items-baseline gap-1">
              <span className="bg-[linear-gradient(135deg,#7c3aed,#9333ea,#ec4899)] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
                {formatToCurrency(currency, lessonPrice)}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {t("perLesson")}
              </span>
            </div>

            <div className="mt-auto flex flex-col gap-2 pt-3">
              {showContinuePayment && pendingPayment ? (
                <Button
                  size="lg"
                  className="group/btn h-10 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
                  onClick={(event) => {
                    event.stopPropagation();
                    continueTutorPendingPayment(pendingPayment, userTimezone);
                  }}
                >
                  <CreditCard className="mr-1.5 size-4" />
                  {t("continuePayment")}
                </Button>
              ) : showSubscribe ? (
                <Link
                  href={`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutor.id)}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex h-10 w-full items-center justify-center rounded-full border-violet-200 text-sm font-semibold text-violet-800 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900",
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <CalendarRange className="mr-1.5 size-4" />
                  {t("subscribeMonthly")}
                </Link>
              ) : showBookTrial ? (
                <Button
                  size="lg"
                  disabled={bookTrialDisabled}
                  title={bookTrialDisabled ? t("bookTrialDisabledHint") : undefined}
                  className="group/btn h-10 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsTrialBookingSheetOpen(true);
                  }}
                >
                  <Calendar className="mr-1.5 size-4" />
                  {t("bookTrial")}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="lg"
                className="h-10 w-full rounded-full border-slate-200 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMessageModalOpen(true);
                }}
              >
                <MessageCircle className="mr-1.5 size-4" />
                {t("sendMessage")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SendMessageModal
        open={isMessageModalOpen}
        title={tutor.firstName}
        senderId={senderId}
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
          prices: {
            baseCurrency: tutorPrices?.baseCurrency ?? ECurrency.VND,
            usd: tutorPrices?.usd ?? 0,
            vnd: tutorPrices?.vnd ?? 0,
            php: tutorPrices?.php ?? 0,
          },
          avatar: tutor.avatar,
        }}
      />
    </>
  );
}
