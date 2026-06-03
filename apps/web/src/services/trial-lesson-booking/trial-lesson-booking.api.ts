import type {
  ApiResponse,
  ECurrency,
  ETrialLessonBookingPaymentStatus,
  ETrialLessonBookingStatus,
  PaginatedData,
  PaginatedResponse,
} from "@mezon-tutors/shared";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { trialLessonBookingQueryKey } from "./trial-lesson-booking.qkey";
import { walletQueryKey } from "../wallet/wallet.qkey";

export type CreateTrialLessonBookingPayload = {
  tutorId: string;
  startAt: string;
  dayOfWeek: number;
  durationMinutes: number;
  currency?: ECurrency;
  useWalletBalance?: boolean;
};

export type TrialLessonBooking = {
  id: string;
  tutorId: string;
  studentId: string;
  startAt: string;
  durationMinutes: number;
  status: string;
  paymentStatus: string;
  grossAmount: number;
  platformFee: number;
  tutorAmount: number;
  deductAmount: number;
  paymentRef: string | null;
  paymentUrl: string | null;
};

export type OccupiedTrialLessonSlotDto = {
  id: string;
  startAt: string;
  durationMinutes: number;
};

export type OccupiedTrialLessonSlotsResponse = {
  items: OccupiedTrialLessonSlotDto[];
};

export type AlreadyBookedTrialLessonResponse = {
  hasBooked: boolean;
  bookingId: string | null;
  status: ETrialLessonBookingStatus | null;
  paymentStatus: ETrialLessonBookingPaymentStatus | null;
  startAt: string | null;
  durationMinutes: number | null;
};

export type CurrentTrialLessonBookingResponse = {
  hasBooked: boolean;
  bookingId: string | null;
  status: ETrialLessonBookingStatus | null;
  paymentStatus: ETrialLessonBookingPaymentStatus | null;
  paymentUrl: string | null;
};

export type TrialLessonBookingRequestItem = {
  id: string;
  tutorId: string;
  studentId: string;
  studentMezonUserId: string | null;
  studentName: string;
  studentAvatarUrl?: string;
  startAt: string;
  durationMinutes: number;
  grossAmount: number;
  platformFee: number;
  tutorAmount: number;
  currency?: string;
  status: ETrialLessonBookingStatus;
  createdAt: string;
  rescheduleRequestSubmitted?: boolean;
  cancellationRequestSubmitted?: boolean;
  scheduleKind?: "subscription";
  subscriptionEnrollmentId?: string;
  subscriptionSlotIndex?: number;
};

export type TrialLessonBookingRequestsResponse =
  PaginatedData<TrialLessonBookingRequestItem>;

export type TrialLessonBookingRequestStatusFilter =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type TrialLessonBookingDetail = {
  id: string;
  startAt: string;
  durationMinutes: number;
  status: string;
  paymentStatus: string;
  grossAmount: number;
  platformFee: number;
  tutorAmount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  tutor: {
    id: string;
    displayName: string;
    avatarUrl: string;
    subject: string;
    headline: string;
    timezone: string;
  };
  student: {
    id: string;
    displayName: string;
    avatarUrl: string;
    email: string;
  };
};

export const trialLessonBookingApi = {
  getOccupiedByTutorAndDate(
    tutorId: string,
    date: string,
    timezone: string,
    excludeBookingId?: string,
  ): Promise<OccupiedTrialLessonSlotsResponse> {
    return apiClient.get<
      ApiResponse<OccupiedTrialLessonSlotsResponse>,
      OccupiedTrialLessonSlotsResponse
    >("/trial-lesson-bookings/occupied", {
      params: {
        tutorId,
        date,
        timezone,
        ...(excludeBookingId ? { excludeBookingId } : {}),
      },
    });
  },

  getOccupiedByTutorAndWeek(
    tutorId: string,
    weekStartDate: string,
    timezone: string,
    excludeBookingId?: string,
  ): Promise<OccupiedTrialLessonSlotsResponse> {
    return apiClient.get<
      ApiResponse<OccupiedTrialLessonSlotsResponse>,
      OccupiedTrialLessonSlotsResponse
    >("/trial-lesson-bookings/occupied", {
      params: {
        tutorId,
        week_start_date: weekStartDate,
        timezone,
        ...(excludeBookingId ? { excludeBookingId } : {}),
      },
    });
  },

  rescheduleTrialLessonBooking(
    bookingId: string,
    payload: { startAt: string; durationMinutes: number },
    timezone: string,
  ): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }, { success: boolean }>(
      `/trial-lesson-bookings/${bookingId}/reschedule`,
      payload,
      { params: { timezone } },
    );
  },

  getAlreadyBookedStatus(
    tutorId: string,
  ): Promise<AlreadyBookedTrialLessonResponse> {
    return apiClient.get<
      ApiResponse<AlreadyBookedTrialLessonResponse>,
      AlreadyBookedTrialLessonResponse
    >("/trial-lesson-bookings/already-booked", {
      params: { tutorId },
    });
  },

  getCurrentBookingStatus(
    tutorId: string,
  ): Promise<CurrentTrialLessonBookingResponse> {
    return apiClient.get<
      ApiResponse<CurrentTrialLessonBookingResponse>,
      CurrentTrialLessonBookingResponse
    >("/trial-lesson-bookings/current-booking", {
      params: { tutorId },
    });
  },

  createTrialLessonBooking(
    payload: CreateTrialLessonBookingPayload,
  ): Promise<TrialLessonBooking> {
    return apiClient.post<ApiResponse<TrialLessonBooking>, TrialLessonBooking>(
      "/trial-lesson-bookings",
      payload,
    );
  },

  getBookingDetail(bookingId: string): Promise<TrialLessonBookingDetail> {
    return apiClient.get<
      ApiResponse<TrialLessonBookingDetail>,
      TrialLessonBookingDetail
    >(`/trial-lesson-bookings/${bookingId}`);
  },

  cancelTrialLessonBooking(
    bookingId: string,
    payload?: { reason?: string; message?: string },
  ): Promise<{ success: boolean; refunded: boolean }> {
    return apiClient.post<
      { success: boolean; refunded: boolean },
      { success: boolean; refunded: boolean }
    >(`/trial-lesson-bookings/${bookingId}/cancel`, payload);
  },

  tutorRescheduleRequest(
    bookingId: string,
    payload: { reason: string; message?: string },
  ): Promise<{ success: boolean; logId: string }> {
    return apiClient.post<
      { success: boolean; logId: string },
      { success: boolean; logId: string }
    >(`/trial-lesson-bookings/${bookingId}/tutor-reschedule-request`, payload);
  },

  tutorCancelBooking(
    bookingId: string,
    payload: { reason: string; message?: string },
  ): Promise<{ success: boolean; logId: string }> {
    return apiClient.post<
      { success: boolean; logId: string },
      { success: boolean; logId: string }
    >(`/trial-lesson-bookings/${bookingId}/tutor-cancel`, payload);
  },

  async getMyTrialLessonBookingRequests(params?: {
    status?: TrialLessonBookingRequestStatusFilter;
    statusIn?: TrialLessonBookingRequestStatusFilter[];
    page?: number;
    limit?: number;
  }): Promise<TrialLessonBookingRequestsResponse> {
    const query: Record<string, string | number | undefined> = {
      page: params?.page,
      limit: params?.limit,
    };
    if (params?.statusIn?.length) {
      query.statusIn = params.statusIn.join(",");
    } else if (params?.status) {
      query.status = params.status;
    }
    const response = await apiClient.get<
      PaginatedResponse<TrialLessonBookingRequestItem>
    >("/trial-lesson-bookings/my-requests", { params: query });
    const page = response.data;
    if (!page) {
      return {
        items: [],
        meta: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 10,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
    return page;
  },
};

export function useGetOccupiedTrialLessonSlots(
  tutorId: string,
  date: string,
  timezone: string,
  enabled = true,
  excludeBookingId?: string,
) {
  return useQuery({
    queryKey: trialLessonBookingQueryKey.occupied(
      tutorId,
      date,
      timezone,
      excludeBookingId,
    ),
    queryFn: () =>
      trialLessonBookingApi.getOccupiedByTutorAndDate(
        tutorId,
        date,
        timezone,
        excludeBookingId,
      ),
    enabled: Boolean(tutorId) && Boolean(date) && Boolean(timezone) && enabled,
  });
}

export function useGetOccupiedTrialLessonSlotsForWeek(
  tutorId: string,
  weekStartDate: string,
  timezone: string,
  enabled = true,
  excludeBookingId?: string,
) {
  return useQuery({
    queryKey: trialLessonBookingQueryKey.occupiedWeek(
      tutorId,
      weekStartDate,
      timezone,
      excludeBookingId,
    ),
    queryFn: () =>
      trialLessonBookingApi.getOccupiedByTutorAndWeek(
        tutorId,
        weekStartDate,
        timezone,
        excludeBookingId,
      ),
    enabled:
      Boolean(tutorId) && Boolean(weekStartDate) && Boolean(timezone) && enabled,
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useRescheduleTrialLessonBookingMutation() {
  return useMutation({
    mutationFn: (args: {
      bookingId: string;
      payload: { startAt: string; durationMinutes: number };
      timezone: string;
    }) =>
      trialLessonBookingApi.rescheduleTrialLessonBooking(
        args.bookingId,
        args.payload,
        args.timezone,
      ),
  });
}

export function useGetAlreadyBookedTrialLesson(
  tutorId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: trialLessonBookingQueryKey.alreadyBooked(tutorId),
    queryFn: () => trialLessonBookingApi.getAlreadyBookedStatus(tutorId),
    enabled: Boolean(tutorId) && enabled,
  });
}

export function useGetCurrentTrialLessonBooking(
  tutorId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: trialLessonBookingQueryKey.currentBooking(tutorId),
    queryFn: () => trialLessonBookingApi.getCurrentBookingStatus(tutorId),
    enabled: Boolean(tutorId) && enabled,
  });
}

export function useCreateTrialLessonBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTrialLessonBookingPayload) =>
      trialLessonBookingApi.createTrialLessonBooking(payload),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: trialLessonBookingQueryKey.currentBooking(variables.tutorId),
      });
      void queryClient.invalidateQueries({
        queryKey: trialLessonBookingQueryKey.alreadyBooked(variables.tutorId),
      });
      if (data.paymentStatus === "SUCCEEDED") {
        void queryClient.invalidateQueries({ queryKey: walletQueryKey.all });
        void queryClient.invalidateQueries({
          queryKey: trialLessonBookingQueryKey.detail(data.id),
        });
      }
    },
  });
}

export function useGetMyTrialLessonBookingRequests(
  params?: {
    status?: TrialLessonBookingRequestStatusFilter;
    statusIn?: TrialLessonBookingRequestStatusFilter[];
    page?: number;
    limit?: number;
  },
  enabled = true,
) {
  const statusKey = params?.statusIn?.length
    ? params.statusIn.join(",")
    : (params?.status ?? "all");
  return useQuery({
    queryKey: trialLessonBookingQueryKey.myRequests(
      statusKey,
      params?.page,
      params?.limit,
    ),
    queryFn: () =>
      trialLessonBookingApi.getMyTrialLessonBookingRequests(params),
    enabled,
  });
}

export function useGetTrialLessonBookingDetail(
  bookingId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: trialLessonBookingQueryKey.detail(bookingId),
    queryFn: () => trialLessonBookingApi.getBookingDetail(bookingId),
    enabled: Boolean(bookingId) && enabled,
  });
}

export function useCancelTrialLessonBookingMutation() {
  return useMutation({
    mutationFn: (args: {
      bookingId: string;
      payload?: { reason?: string; message?: string };
    }) => trialLessonBookingApi.cancelTrialLessonBooking(args.bookingId, args.payload),
  });
}

export function useTutorRescheduleRequestMutation() {
  return useMutation({
    mutationFn: (args: {
      bookingId: string;
      payload: { reason: string; message?: string };
    }) =>
      trialLessonBookingApi.tutorRescheduleRequest(
        args.bookingId,
        args.payload,
      ),
  });
}

export function useTutorCancelTrialLessonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      bookingId: string;
      payload: { reason: string; message?: string };
    }) => trialLessonBookingApi.tutorCancelBooking(args.bookingId, args.payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trial-lesson-booking-my-requests'] });
    },
  });
}

