"use client";

import {
  ECurrency,
  ROUTES,
  type TutorAboutDto,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { useState } from "react";
import {
  continueTutorPendingPayment,
  useCurrency,
  useTutorPendingPayment,
  useUserTimezone,
} from "@/hooks";
import {
  useGetSubscriptionEligibility,
  useGetSubscriptionPlansByTutor,
} from "@/services";
import { userAtom } from "@/store/auth.atom";

export function useTutorBookingActions(tutor: TutorAboutDto) {
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

  const { data: elig, isPending: eligPending } = useGetSubscriptionEligibility(
    tutor.id,
    canFetchSub,
  );
  const { data: subscriptionPlans } = useGetSubscriptionPlansByTutor(
    tutor.id,
    canFetchSub,
  );
  const { pendingPayment } = useTutorPendingPayment(tutor.id, canFetchSub);

  const hasSubscriptionPlans = Boolean(subscriptionPlans?.length);
  const trialDone =
    elig?.trialStatus === "COMPLETED" &&
    elig?.trialPaymentStatus === "SUCCEEDED";
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
    (eligPending ||
      (elig?.trialStatus != null && elig.trialStatus !== "COMPLETED"));

  const lessonPrice =
    currency === ECurrency.USD
      ? tutor.prices.usd
      : currency === ECurrency.PHP
        ? tutor.prices.php
        : tutor.prices.vnd;

  const handleBookLesson = () => {
    if (showContinuePayment && pendingPayment) {
      continueTutorPendingPayment(pendingPayment, userTimezone);
      return;
    }
    if (showBookTrial) {
      setIsTrialBookingSheetOpen(true);
      return;
    }
    if (showSubscribe) {
      window.location.href = `${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutor.id)}`;
    }
  };

  return {
    name,
    senderId,
    senderMezonUserId,
    recipientId,
    isOwnProfile,
    isAlreadyEnrolled: elig?.reason === "ALREADY_ENROLLED",
    subscriptionPlans: subscriptionPlans ?? [],
    lessonPrice,
    currency,
    isMessageModalOpen,
    setIsMessageModalOpen,
    isTrialBookingSheetOpen,
    setIsTrialBookingSheetOpen,
    showContinuePayment,
    showBookTrial,
    showSubscribe,
    showBusyBadge,
    bookTrialDisabled,
    pendingPayment,
    handleBookLesson,
    canBookLesson:
      showContinuePayment || showBookTrial || showSubscribe || showBusyBadge,
  };
}
