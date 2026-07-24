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
import { isLoadingAtom, userAtom } from "@/store/auth.atom";
import { TrialBookingSheet } from "./TrialBookingSheet";
import { SendMessageModal } from "@/components/common/SendMessageModal";
import { cn } from "@/lib/utils";
import { SaveTutorButton } from "./SaveTutorButton";
import ReactGA from "react-ga4";
import { ProfessionalBadge } from "@/components/icons";
import DEFAULT_AVATAR from '@/public/images/default-avatar.png';

type TutorCardProps = {
  tutor: VerifiedTutorProfileDto;
  isActive?: boolean;
  onHoverAction?: (tutor: VerifiedTutorProfileDto) => void;
  onSelectAction?: (tutor: VerifiedTutorProfileDto) => void;
  preview?: boolean;
};

export default function TutorCard({
  tutor,
  isActive = false,
  onHoverAction,
  onSelectAction,
  preview = false,
}: TutorCardProps) {
  const t = useTranslations("Tutors.TutorCard");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tCountry = useTranslations("Tutors.Filter.Country");
  const tLanguage = useTranslations("Tutors.Filter.Language");
  const { currency } = useCurrency();
  const userTimezone = useUserTimezone();
  const currentUser = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isTrialBookingSheetOpen, setIsTrialBookingSheetOpen] = useState(false);

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const senderId = currentUser?.id ?? '';
  const senderMezonUserId = currentUser?.mezonUserId;
  const recipientId = tutor.userId;
  const isOwnProfile =
    !preview && Boolean(currentUser?.id && currentUser.id === tutor.userId);
  const canFetchSub = Boolean(currentUser?.id && !isOwnProfile && !preview);
  const { data: elig, isFetched: eligFetched } = useGetSubscriptionEligibility(tutor.id, canFetchSub);
  const { data: subscriptionPlans, isFetched: plansFetched } = useGetSubscriptionPlansByTutor(tutor.id, canFetchSub);
  const { pendingPayment, isPending: ppPending } = useTutorPendingPayment(tutor.id, canFetchSub);
  const hasSubscriptionPlans = Boolean(subscriptionPlans?.length);
  const trialDone =
    elig?.trialStatus === "COMPLETED" && elig?.trialPaymentStatus === "SUCCEEDED";
  const showContinuePayment = canFetchSub && Boolean(pendingPayment);
  const showMonthlyActions = tutor.activeStatus !== false;
  const isTutorTemporarilyBusy = !isOwnProfile && tutor.activeStatus === false;

  const isBookingReady =
    preview ||
    (!isAuthLoading &&
      (!canFetchSub || (eligFetched && plansFetched && !ppPending)));

  const wouldShowSubscribeIfActive =
    canFetchSub &&
    !showContinuePayment &&
    trialDone &&
    hasSubscriptionPlans &&
    elig?.reason !== "ALREADY_ENROLLED";
  const wouldShowBookTrialIfActive =
    !isOwnProfile && (!currentUser?.id || !trialDone) && !showContinuePayment;
  const showSubscribe = showMonthlyActions && wouldShowSubscribeIfActive;
  const showBookTrial = preview || (showMonthlyActions && wouldShowBookTrialIfActive);
  const showBusyBadge =
    isTutorTemporarilyBusy &&
    !showContinuePayment &&
    (wouldShowBookTrialIfActive || wouldShowSubscribeIfActive);
  const bookTrialDisabled =
    canFetchSub &&
    elig != null &&
    elig?.trialStatus != null &&
    elig?.trialStatus !== "COMPLETED";

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
        className={cn(
          'group relative overflow-hidden py-0 transition-all duration-300',
          preview
            ? 'cursor-default border-violet-100'
            : 'cursor-pointer',
          !preview &&
          (isActive
            ? 'border-violet-300 shadow-lg shadow-violet-200/40 ring-2 ring-violet-200/60'
            : 'border-slate-100 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40'),
        )}
        onMouseEnter={preview ? undefined : () => onHoverAction?.(tutor)}
        onClick={preview ? undefined : () => onSelectAction?.(tutor)}
      >
        {isActive ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-brand-gradient" />
        ) : null}

        <CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-stretch md:gap-6">
          <div className="flex flex-1 items-start gap-4">
            <div className="relative shrink-0">
              <Image
                src={tutor.avatar || DEFAULT_AVATAR}
                alt={name}
                width={140}
                height={140}
                unoptimized={
                  (tutor.avatar || '').startsWith('data:') || (tutor.avatar || '').startsWith('blob:')
                }
                className="aspect-square size-28 rounded-2xl object-cover object-center shadow-sm md:size-36"
              />
              {tutor.isProfessional ? (
                <div className="absolute -bottom-3 -right-3 flex items-center gap-1 rounded-full bg-brand-gradient-135shadow-md shadow-violet-300/40">
                  <ProfessionalBadge className="size-8" strokeWidth={3} />
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 transition-colors group-hover:text-violet-700 md:text-2xl">
                  {name}
                </h3>
                {!isOwnProfile && !preview ? (
                  <SaveTutorButton tutorId={tutor.id} isSaved={tutor.isSaved} iconOnly />
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700 ring-1 ring-violet-100">
                  <GraduationCap className="size-3.5" />
                  {tutor.subject ? tSubject(tutor.subject) : t("noSubject")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2.5 py-1 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100">
                  <MapPin className="size-3.5" />
                  {tutor.country ? tCountry(tutor.country) : t("noCountry")}
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
              <span className="text-brand-gradient text-2xl font-extrabold tracking-tight">
                {formatToCurrency(currency, lessonPrice)}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {t("perLesson")}
              </span>
            </div>

            <div className="mt-auto flex flex-col gap-2 pt-3">
              {!isBookingReady ? (
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-full animate-pulse rounded-full bg-gray-200" />
                </div>
              ) : showContinuePayment && pendingPayment ? (
                <Button
                  size="lg"
                  className="group/btn h-10 w-full rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
                  onClick={(event) => {
                    event.stopPropagation();
                    continueTutorPendingPayment(pendingPayment, userTimezone);
                  }}
                >
                  <CreditCard className="mr-1.5 size-4" />
                  {t("continuePayment")}
                </Button>
              ) : showBusyBadge ? (
                <span className="inline-flex h-10 w-full items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 text-center text-sm font-semibold text-amber-800">
                  {t("temporarilyBusy")}
                </span>
              ) : showSubscribe ? (
                <Link
                  href={`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutor.id)}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex h-10 w-full items-center justify-center rounded-full border-violet-200 text-sm font-semibold text-violet-800 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    ReactGA.event("view_schedule_click", { tutor_id: tutor.id });
                  }}
                >
                  <CalendarRange className="mr-1.5 size-4" />
                  {t("subscribeMonthly")}
                </Link>
              ) : showBookTrial ? (
                <Button
                  size="lg"
                  disabled={preview || bookTrialDisabled}
                  title={bookTrialDisabled ? t("bookTrialDisabledHint") : undefined}
                  variant="gradient"
                  className="h-10 w-full rounded-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    ReactGA.event("view_schedule_click", { tutor_id: tutor.id });
                    if (!preview) setIsTrialBookingSheetOpen(true);
                  }}
                >
                  <Calendar className="mr-1.5 size-4" />
                  {t("bookTrial")}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="lg"
                disabled={preview}
                className="h-10 w-full rounded-full border-slate-200 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!preview) setIsMessageModalOpen(true);
                }}
              >
                <MessageCircle className="mr-1.5 size-4" />
                {t("sendMessage")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!preview ? (
        <>
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
      ) : null}
    </>
  );
}
