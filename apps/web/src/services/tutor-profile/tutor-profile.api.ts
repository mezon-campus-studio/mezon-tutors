import { apiClient, publicApiClient } from "../api-client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tutorProfileQueryKey } from "./tutor-profile.qkey";
import {
  ApiResponse,
  PaginatedData,
  PaginatedResponse,
  ETutorSortBy,
  ECountry,
  ECurrency,
  ESubject,
  VerifiedTutorProfileDto,
  TutorAboutDto,
  TutorScheduleDto,
  TutorReviewsDto,
  TutorResourcesDto,
  SubmitTutorProfileDto,
  UpdateMyTutorProfileDto,
  UpdateTutorSetupChecklistDto,
  TutorSetupChecklistDto,
  VerificationStatus,
} from "@mezon-tutors/shared";

type VerifiedTutorFilters = {
  sortBy: ETutorSortBy;
  subject?: ESubject;
  country?: ECountry;
  currency?: ECurrency;
  minPrice?: number;
  maxPrice?: number;
};

export const tutorProfileApi = {
  async getVerifiedTutors(
    page: number,
    limit: number,
    filters: VerifiedTutorFilters
  ): Promise<PaginatedData<VerifiedTutorProfileDto> | null> {
    const { sortBy, subject, country, currency, minPrice, maxPrice } = filters;

    const response = await publicApiClient.get<PaginatedResponse<VerifiedTutorProfileDto>>(
      "/tutor-profiles/verified",
      {
        params: {
          page,
          limit,
          sortBy,
          subject,
          country,
          currency,
          minPrice,
          maxPrice,
        },
      }
    );
    return response.data;
  },

  getVerifiedTutorAbout(id: string): Promise<TutorAboutDto> {
    return apiClient.get<ApiResponse<TutorAboutDto>, TutorAboutDto>(`/tutor-profiles/${id}/about`);
  },

  getVerifiedTutorSchedule(id: string): Promise<TutorScheduleDto> {
    return apiClient.get<ApiResponse<TutorScheduleDto>, TutorScheduleDto>(
      `/tutor-profiles/${id}/schedule`
    );
  },

  getVerifiedTutorReviews(id: string): Promise<TutorReviewsDto> {
    return apiClient.get<ApiResponse<TutorReviewsDto>, TutorReviewsDto>(
      `/tutor-profiles/${id}/reviews`
    );
  },

  getVerifiedTutorResources(id: string): Promise<TutorResourcesDto> {
    return apiClient.get<ApiResponse<TutorResourcesDto>, TutorResourcesDto>(
      `/tutor-profiles/${id}/resources`
    );
  },

  submit(payload: SubmitTutorProfileDto): Promise<boolean> {
    return apiClient.post<ApiResponse<boolean>, boolean>("/tutor-profiles", payload);
  },

  updateMyProfile(payload: UpdateMyTutorProfileDto): Promise<boolean> {
    return apiClient.put<ApiResponse<boolean>, boolean>("/tutor-profiles/me", payload);
  },

  getMyProfile(): Promise<{
    hasProfile: boolean;
    verificationStatus: VerificationStatus | null;
    profile: any;
  }> {
    return apiClient.get<
      ApiResponse<{
        hasProfile: boolean;
        verificationStatus: VerificationStatus | null;
        profile: any;
      }>,
      {
        hasProfile: boolean;
        verificationStatus: VerificationStatus | null;
        profile: any;
      }
    >("/tutor-profiles/me");
  },

  getMySetupChecklist(): Promise<TutorSetupChecklistDto> {
    return apiClient.get<ApiResponse<TutorSetupChecklistDto>, TutorSetupChecklistDto>(
      "/tutor-profiles/me/setup-checklist",
    );
  },

  updateMySetupChecklist(payload: UpdateTutorSetupChecklistDto): Promise<TutorSetupChecklistDto> {
    return apiClient.patch<ApiResponse<TutorSetupChecklistDto>, TutorSetupChecklistDto>(
      "/tutor-profiles/me/setup-checklist",
      payload,
    );
  },
};

const useGetVerifiedTutors = (page: number, limit: number, filters: VerifiedTutorFilters) => {
  return useQuery({
    queryKey: tutorProfileQueryKey.verifiedTutors(
      page,
      limit,
      filters.sortBy,
      filters.subject,
      filters.country,
      filters.currency,
      filters.minPrice,
      filters.maxPrice
    ),
    queryFn: () => tutorProfileApi.getVerifiedTutors(page, limit, filters),
    placeholderData: keepPreviousData,
  });
};

const useGetVerifiedTutorAbout = (id: string) => {
  return useQuery({
    queryKey: tutorProfileQueryKey.tutorAbout(id),
    queryFn: () => tutorProfileApi.getVerifiedTutorAbout(id),
    enabled: !!id,
  });
};

const useGetVerifiedTutorSchedule = (id: string, enabled = false) => {
  return useQuery({
    queryKey: tutorProfileQueryKey.tutorSchedule(id),
    queryFn: () => tutorProfileApi.getVerifiedTutorSchedule(id),
    enabled: !!id && enabled,
  });
};

const useGetVerifiedTutorReviews = (id: string, enabled = false) => {
  return useQuery({
    queryKey: tutorProfileQueryKey.tutorReviews(id),
    queryFn: () => tutorProfileApi.getVerifiedTutorReviews(id),
    enabled: !!id && enabled,
  });
};

const useGetVerifiedTutorResources = (id: string, enabled = false) => {
  return useQuery({
    queryKey: tutorProfileQueryKey.tutorResources(id),
    queryFn: () => tutorProfileApi.getVerifiedTutorResources(id),
    enabled: !!id && enabled,
  });
};

const useSubmitTutorProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitTutorProfileDto) => tutorProfileApi.submit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verified-tutors"] });
      queryClient.invalidateQueries({ queryKey: tutorProfileQueryKey.myTutorProfile() });
    },
  });
};

const useUpdateMyTutorProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMyTutorProfileDto) => tutorProfileApi.updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorProfileQueryKey.myTutorProfile() });
    },
  });
};

export function submitTutorProfile(payload: SubmitTutorProfileDto): Promise<boolean> {
  return tutorProfileApi.submit(payload);
}

const useGetMyProfile = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: tutorProfileQueryKey.myTutorProfile(),
    queryFn: () => tutorProfileApi.getMyProfile(),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};

const useGetMySetupChecklist = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: tutorProfileQueryKey.mySetupChecklist(),
    queryFn: () => tutorProfileApi.getMySetupChecklist(),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
};

const useUpdateMySetupChecklistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTutorSetupChecklistDto) =>
      tutorProfileApi.updateMySetupChecklist(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(tutorProfileQueryKey.mySetupChecklist(), data);
    },
  });
};

export {
  useGetVerifiedTutors,
  useGetVerifiedTutorAbout,
  useGetVerifiedTutorSchedule,
  useGetVerifiedTutorReviews,
  useGetVerifiedTutorResources,
  useSubmitTutorProfileMutation,
  useUpdateMyTutorProfileMutation,
  useGetMyProfile,
  useGetMySetupChecklist,
  useUpdateMySetupChecklistMutation,
};
