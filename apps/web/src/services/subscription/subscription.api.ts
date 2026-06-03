import type {
  ApiResponse,
  CreateSubscriptionEnrollmentDto,
  SubscriptionEligibilityDto,
  SubscriptionEnrollmentDetailDto,
  SubscriptionEnrollmentDto,
  SubscriptionSlotCancelResult,
  SubscriptionSlotRescheduleOptionsResponse,
  SubscriptionSlotRescheduleResult,
  RescheduleSubscriptionSlotPayload,
  TutorSubscriptionPlanDto,
  TutorSubscriptionSlotRescheduleRequestResult,
  TutorSubscriptionWeekOccurrenceDto,
} from "@mezon-tutors/shared";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "../api-client";
import { subscriptionQueryKey } from "./subscription.qkey";
import { walletQueryKey } from "../wallet/wallet.qkey";

const TUTOR_WEEK_OCCURRENCES_STALE_MS = 60_000;

function tutorWeekOccurrencesQueryOptions(
  weekStartDate: string,
  timezone: string,
  enabled = true,
) {
  return {
    queryKey: subscriptionQueryKey.tutorWeekOccurrences(
      weekStartDate,
      timezone,
    ),
    queryFn: () =>
      subscriptionApi.getTutorWeekOccurrences(weekStartDate, timezone),
    enabled: enabled && Boolean(weekStartDate) && Boolean(timezone),
    staleTime: TUTOR_WEEK_OCCURRENCES_STALE_MS,
  };
}

export const subscriptionApi = {
  getPlansByTutorId(tutorId: string): Promise<TutorSubscriptionPlanDto[]> {
    return apiClient.get<
      ApiResponse<TutorSubscriptionPlanDto[]>,
      TutorSubscriptionPlanDto[]
    >("/subscription-plans", { params: { tutorId } });
  },

  getEligibility(tutorId: string): Promise<SubscriptionEligibilityDto> {
    return apiClient.get<
      ApiResponse<SubscriptionEligibilityDto>,
      SubscriptionEligibilityDto
    >("/subscription-enrollments/eligibility", { params: { tutorId } });
  },

  createEnrollment(
    body: CreateSubscriptionEnrollmentDto,
  ): Promise<SubscriptionEnrollmentDto> {
    return apiClient.post<
      ApiResponse<SubscriptionEnrollmentDto>,
      SubscriptionEnrollmentDto
    >("/subscription-enrollments", body);
  },

  getEnrollment(id: string): Promise<SubscriptionEnrollmentDetailDto> {
    return apiClient.get<
      ApiResponse<SubscriptionEnrollmentDetailDto>,
      SubscriptionEnrollmentDetailDto
    >(`/subscription-enrollments/${id}`);
  },

  cancelSlot(
    enrollmentId: string,
    slotIndex: number,
    payload: { reason: string; message?: string },
  ): Promise<SubscriptionSlotCancelResult> {
    return apiClient.post<
      ApiResponse<SubscriptionSlotCancelResult>,
      SubscriptionSlotCancelResult
    >(`/subscription-enrollments/${enrollmentId}/slots/${slotIndex}/cancel`, payload);
  },

  getRescheduleOptions(
    enrollmentId: string,
    slotIndex: number,
    weekStartDate: string,
    timezone: string,
  ): Promise<SubscriptionSlotRescheduleOptionsResponse> {
    return apiClient.get<
      ApiResponse<SubscriptionSlotRescheduleOptionsResponse>,
      SubscriptionSlotRescheduleOptionsResponse
    >(
      `/subscription-enrollments/${enrollmentId}/slots/${slotIndex}/reschedule-options`,
      { params: { week_start_date: weekStartDate, timezone } },
    );
  },

  rescheduleSlot(
    enrollmentId: string,
    slotIndex: number,
    payload: RescheduleSubscriptionSlotPayload,
    timezone: string,
  ): Promise<SubscriptionSlotRescheduleResult> {
    return apiClient.post<
      ApiResponse<SubscriptionSlotRescheduleResult>,
      SubscriptionSlotRescheduleResult
    >(
      `/subscription-enrollments/${enrollmentId}/slots/${slotIndex}/reschedule`,
      payload,
      { params: { timezone } },
    );
  },

  tutorRescheduleRequest(
    enrollmentId: string,
    slotIndex: number,
    payload: { reason: string; message?: string; occurrenceStartAt: string },
  ): Promise<TutorSubscriptionSlotRescheduleRequestResult> {
    return apiClient.post<
      TutorSubscriptionSlotRescheduleRequestResult,
      TutorSubscriptionSlotRescheduleRequestResult
    >(
      `/subscription-enrollments/${enrollmentId}/slots/${slotIndex}/tutor-reschedule-request`,
      payload,
    );
  },

  tutorCancelSlot(
    enrollmentId: string,
    slotIndex: number,
    payload: { reason: string; message?: string; occurrenceStartAt: string },
  ): Promise<TutorSubscriptionSlotRescheduleRequestResult> {
    return apiClient.post<
      TutorSubscriptionSlotRescheduleRequestResult,
      TutorSubscriptionSlotRescheduleRequestResult
    >(
      `/subscription-enrollments/${enrollmentId}/slots/${slotIndex}/tutor-cancel`,
      payload,
    );
  },

  getTutorWeekOccurrences(
    weekStartDate: string,
    timezone: string,
  ): Promise<TutorSubscriptionWeekOccurrenceDto[]> {
    return apiClient.get<
      ApiResponse<TutorSubscriptionWeekOccurrenceDto[]>,
      TutorSubscriptionWeekOccurrenceDto[]
    >("/subscription-enrollments/tutor/week-occurrences", {
      params: { week_start_date: weekStartDate, timezone },
    });
  },
};

export function useGetSubscriptionPlansByTutor(
  tutorId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: subscriptionQueryKey.plansByTutor(tutorId),
    queryFn: () => subscriptionApi.getPlansByTutorId(tutorId),
    enabled: Boolean(tutorId) && enabled,
  });
}

export function useGetSubscriptionEligibility(tutorId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionQueryKey.eligibility(tutorId),
    queryFn: () => subscriptionApi.getEligibility(tutorId),
    enabled: Boolean(tutorId) && enabled,
  });
}

export function useCreateSubscriptionEnrollmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubscriptionEnrollmentDto) =>
      subscriptionApi.createEnrollment(body),
    onSuccess: (data, variables) => {
      void qc.invalidateQueries({
        queryKey: subscriptionQueryKey.eligibility(variables.tutorId),
      });
      void qc.invalidateQueries({
        queryKey: subscriptionQueryKey.enrollment(data.id),
      });
      void qc.invalidateQueries({ queryKey: subscriptionQueryKey.root });
      if (data.paymentStatus === "SUCCEEDED") {
        void qc.invalidateQueries({ queryKey: walletQueryKey.all });
      }
    },
  });
}

export function useGetSubscriptionEnrollment(
  enrollmentId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: subscriptionQueryKey.enrollment(enrollmentId),
    queryFn: () => subscriptionApi.getEnrollment(enrollmentId),
    enabled: Boolean(enrollmentId) && enabled,
  });
}

export function useCancelSubscriptionSlotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      enrollmentId: string;
      slotIndex: number;
      payload: { reason: string; message?: string };
    }) =>
      subscriptionApi.cancelSlot(
        params.enrollmentId,
        params.slotIndex,
        params.payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-lessons"] });
    },
  });
}

export function useGetSubscriptionSlotRescheduleOptions(
  enrollmentId: string,
  slotIndex: number,
  weekStartDate: string,
  timezone: string,
  enabled = true,
) {
  return useQuery({
    queryKey: subscriptionQueryKey.rescheduleOptions(
      enrollmentId,
      slotIndex,
      weekStartDate,
      timezone,
    ),
    queryFn: () =>
      subscriptionApi.getRescheduleOptions(
        enrollmentId,
        slotIndex,
        weekStartDate,
        timezone,
      ),
    enabled:
      enabled &&
      Boolean(enrollmentId) &&
      slotIndex >= 0 &&
      Boolean(weekStartDate) &&
      Boolean(timezone),
    staleTime: 15 * 1000,
  });
}

export function useRescheduleSubscriptionSlotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      enrollmentId: string;
      slotIndex: number;
      payload: RescheduleSubscriptionSlotPayload;
      timezone: string;
    }) =>
      subscriptionApi.rescheduleSlot(
        params.enrollmentId,
        params.slotIndex,
        params.payload,
        params.timezone,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-lessons"] });
    },
  });
}

export function useTutorSubscriptionSlotRescheduleRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      enrollmentId: string;
      slotIndex: number;
      payload: { reason: string; message?: string; occurrenceStartAt: string };
    }) =>
      subscriptionApi.tutorRescheduleRequest(
        params.enrollmentId,
        params.slotIndex,
        params.payload,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: subscriptionQueryKey.root,
      });
    },
  });
}

export function useTutorCancelSubscriptionSlotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      enrollmentId: string;
      slotIndex: number;
      payload: { reason: string; message?: string; occurrenceStartAt: string };
    }) =>
      subscriptionApi.tutorCancelSlot(
        params.enrollmentId,
        params.slotIndex,
        params.payload,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: subscriptionQueryKey.root,
      });
    },
  });
}

export function useGetTutorSubscriptionWeekOccurrences(
  weekStartDate: string,
  timezone: string,
  enabled = true,
) {
  return useQuery(
    tutorWeekOccurrencesQueryOptions(weekStartDate, timezone, enabled),
  );
}

function mergeTutorSubscriptionWeekOccurrences(
  weeks: (TutorSubscriptionWeekOccurrenceDto[] | undefined)[],
): TutorSubscriptionWeekOccurrenceDto[] {
  const merged: TutorSubscriptionWeekOccurrenceDto[] = [];
  const seen = new Set<string>();
  for (const rows of weeks) {
    for (const row of rows ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
  }
  return merged;
}

export function useGetTutorSubscriptionWeekOccurrencesBatch(
  weekStartDates: string[],
  timezone: string,
  enabled = true,
) {
  const queries = useQueries({
    queries: weekStartDates.map((weekStartDate) =>
      tutorWeekOccurrencesQueryOptions(weekStartDate, timezone, enabled),
    ),
  });

  const data = useMemo(
    () => mergeTutorSubscriptionWeekOccurrences(queries.map((q) => q.data)),
    [queries],
  );

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);

  return { data, isLoading, isFetching, queries };
}
