"use client";

import { jsDayToDbDayOfWeek, ROUTES } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useMemo } from "react";
import {
  useGetStudentPendingPaymentBookings,
  useGetStudentPendingPaymentEnrollments,
  type StudentPendingPaymentBooking,
  type StudentPendingPaymentEnrollment,
} from "@/services";

dayjs.extend(utc);
dayjs.extend(timezone);

export type TutorPendingPayment =
  | {
      kind: "trial";
      paymentUrl: string | null;
      expiresAt: string;
      item: StudentPendingPaymentBooking;
    }
  | {
      kind: "plan";
      paymentUrl: string | null;
      expiresAt: string;
      item: StudentPendingPaymentEnrollment;
    };

function isActivePending(expiresAt: string, nowMs: number) {
  return new Date(expiresAt).getTime() > nowMs;
}

export function useTutorPendingPayment(tutorId: string, enabled = true) {
  const canFetch = enabled && Boolean(tutorId);
  const { data: trialData, isPending: isTrialPending } =
    useGetStudentPendingPaymentBookings(canFetch);
  const { data: planData, isPending: isPlanPending } =
    useGetStudentPendingPaymentEnrollments(canFetch);

  const pendingPayment = useMemo((): TutorPendingPayment | null => {
    const nowMs = Date.now();
    const trialItem = (trialData?.items ?? []).find(
      (item) => item.tutorId === tutorId && isActivePending(item.expiresAt, nowMs),
    );
    if (trialItem) {
      return {
        kind: "trial",
        paymentUrl: trialItem.paymentUrl,
        expiresAt: trialItem.expiresAt,
        item: trialItem,
      };
    }

    const planItem = (planData?.items ?? []).find(
      (item) => item.tutorId === tutorId && isActivePending(item.expiresAt, nowMs),
    );
    if (planItem) {
      return {
        kind: "plan",
        paymentUrl: planItem.paymentUrl,
        expiresAt: planItem.expiresAt,
        item: planItem,
      };
    }

    return null;
  }, [planData?.items, trialData?.items, tutorId]);

  return {
    pendingPayment,
    isPending: isTrialPending || isPlanPending,
  };
}

export function continueTutorPendingPayment(
  pending: TutorPendingPayment,
  userTimezone: string,
) {
  if (pending.paymentUrl && typeof window !== "undefined") {
    window.location.assign(pending.paymentUrl);
    return;
  }

  if (pending.kind === "trial") {
    const { tutorId, startAt, durationMinutes } = pending.item;
    const dayOfWeek = jsDayToDbDayOfWeek(dayjs(startAt).tz(userTimezone).day());
    const params = new URLSearchParams({
      tutorId,
      startAt,
      durationMinutes: String(durationMinutes),
      dayOfWeek: String(dayOfWeek),
      timezone: userTimezone,
    });
    window.location.assign(`${ROUTES.CHECKOUT.TRIAL_LESSON}?${params.toString()}`);
    return;
  }

  const params = new URLSearchParams({
    tutorId: pending.item.tutorId,
    lessonsPerWeek: String(pending.item.lessonsPerWeek),
  });
  window.location.assign(
    `${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_SCHEDULE}?${params.toString()}`,
  );
}
