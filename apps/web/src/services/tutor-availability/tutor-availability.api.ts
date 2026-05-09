import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, TutorScheduleDto } from '@mezon-tutors/shared'
import { apiClient } from '../api-client'
import { tutorAvailabilityQueryKey } from './tutor-availability.qkey'

const tutorAvailabilityApi = {
  getByTutorId(tutorId: string): Promise<TutorScheduleDto> {
    return apiClient.get<ApiResponse<TutorScheduleDto>, TutorScheduleDto>(
      `/tutor-availability/${tutorId}`
    )
  },
}

export function useGetTutorAvailability(tutorId: string, enabled = true) {
  return useQuery({
    queryKey: tutorAvailabilityQueryKey.byTutor(tutorId),
    queryFn: () => tutorAvailabilityApi.getByTutorId(tutorId),
    enabled: Boolean(tutorId) && enabled,
  })
}