import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApiResponse,
  CreateSubscriptionEnrollmentDto,
  SubscriptionEligibilityDto,
  SubscriptionEnrollmentDetailDto,
  SubscriptionEnrollmentDto,
  TutorSubscriptionPlanDto,
  TutorSubscriptionWeekOccurrenceDto,
} from '@mezon-tutors/shared'
import { apiClient } from '../api-client'
import { subscriptionQueryKey } from './subscription.qkey'

export const subscriptionApi = {
  getPlansByTutorId(tutorId: string): Promise<TutorSubscriptionPlanDto[]> {
    return apiClient.get<ApiResponse<TutorSubscriptionPlanDto[]>, TutorSubscriptionPlanDto[]>(
      '/subscription-plans',
      { params: { tutorId } }
    )
  },

  getEligibility(tutorId: string): Promise<SubscriptionEligibilityDto> {
    return apiClient.get<ApiResponse<SubscriptionEligibilityDto>, SubscriptionEligibilityDto>(
      '/subscription-enrollments/eligibility',
      { params: { tutorId } }
    )
  },

  createEnrollment(body: CreateSubscriptionEnrollmentDto): Promise<SubscriptionEnrollmentDto> {
    return apiClient.post<ApiResponse<SubscriptionEnrollmentDto>, SubscriptionEnrollmentDto>(
      '/subscription-enrollments',
      body
    )
  },

  getEnrollment(id: string): Promise<SubscriptionEnrollmentDetailDto> {
    return apiClient.get<ApiResponse<SubscriptionEnrollmentDetailDto>, SubscriptionEnrollmentDetailDto>(
      `/subscription-enrollments/${id}`
    )
  },

  getTutorWeekOccurrences(weekStartDate: string): Promise<TutorSubscriptionWeekOccurrenceDto[]> {
    return apiClient.get<
      ApiResponse<TutorSubscriptionWeekOccurrenceDto[]>,
      TutorSubscriptionWeekOccurrenceDto[]
    >('/subscription-enrollments/tutor/week-occurrences', {
      params: { week_start_date: weekStartDate },
    })
  },
}

export function useGetSubscriptionPlansByTutor(tutorId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionQueryKey.plansByTutor(tutorId),
    queryFn: () => subscriptionApi.getPlansByTutorId(tutorId),
    enabled: Boolean(tutorId) && enabled,
  })
}

export function useGetSubscriptionEligibility(tutorId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionQueryKey.eligibility(tutorId),
    queryFn: () => subscriptionApi.getEligibility(tutorId),
    enabled: Boolean(tutorId) && enabled,
  })
}

export function useCreateSubscriptionEnrollmentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSubscriptionEnrollmentDto) => subscriptionApi.createEnrollment(body),
    onSuccess: (data, variables) => {
      void qc.invalidateQueries({ queryKey: subscriptionQueryKey.eligibility(variables.tutorId) })
      void qc.invalidateQueries({ queryKey: subscriptionQueryKey.enrollment(data.id) })
      void qc.invalidateQueries({ queryKey: subscriptionQueryKey.root })
    },
  })
}

export function useGetSubscriptionEnrollment(enrollmentId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionQueryKey.enrollment(enrollmentId),
    queryFn: () => subscriptionApi.getEnrollment(enrollmentId),
    enabled: Boolean(enrollmentId) && enabled,
  })
}

export function useGetTutorSubscriptionWeekOccurrences(weekStartDate: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionQueryKey.tutorWeekOccurrences(weekStartDate),
    queryFn: () => subscriptionApi.getTutorWeekOccurrences(weekStartDate),
    enabled: Boolean(weekStartDate) && enabled,
  })
}
