import type {
  FullTutorApplication,
  IdentityVerification,
  IdentityVerificationStatus,
  ProfessionalDocument,
  ProfessionalDocumentStatus,
  TutorAdminNote,
  TutorApplicationMetrics,
  TutorProfile,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { adminTutorApplicationQueryKey } from "./admin-tutor-application.qkey";

const BASE = "/admin";

export type CreateAdminNotePayload = {
  tutorId: string;
  reviewerId: string;
  reviewerName: string;
  content: string;
};

export type UpdateProfessionalDocumentStatusPayload = {
  status: ProfessionalDocumentStatus;
};

export type UpdateIdentityVerificationStatusPayload = {
  status: IdentityVerificationStatus;
  nameMatch: boolean;
  notExpired: boolean;
  photoClarity: boolean;
};

export const adminTutorApplicationApi = {
  list(): Promise<TutorProfile[]> {
    return apiClient.get<TutorProfile[]>(`${BASE}/tutor-applications`);
  },

  metrics(): Promise<TutorApplicationMetrics> {
    return apiClient.get<TutorApplicationMetrics>(
      `${BASE}/tutor-applications/metrics`,
    );
  },

  detail(id: string): Promise<FullTutorApplication> {
    return apiClient.get<FullTutorApplication>(`${BASE}/tutor-profiles/${id}`);
  },

  approve(id: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `${BASE}/tutor-applications/${id}/approve`,
    );
  },

  reject(id: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `${BASE}/tutor-applications/${id}/reject`,
    );
  },

  createAdminNote(payload: CreateAdminNotePayload): Promise<TutorAdminNote> {
    return apiClient.post<TutorAdminNote>(`${BASE}/tutor-admin-notes`, payload);
  },

  updateProfessionalDocumentStatus(
    id: string,
    payload: UpdateProfessionalDocumentStatusPayload,
  ): Promise<ProfessionalDocument> {
    return apiClient.patch<ProfessionalDocument>(
      `${BASE}/professional-documents/${id}/status`,
      payload,
    );
  },

  updateIdentityVerificationStatus(
    id: string,
    payload: UpdateIdentityVerificationStatusPayload,
  ): Promise<IdentityVerification> {
    return apiClient.patch<IdentityVerification>(
      `${BASE}/identity-verification/${id}/status`,
      payload,
    );
  },
};

export const useAdminTutorApplications = (enabled = true) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.list(),
    queryFn: () => adminTutorApplicationApi.list(),
    enabled,
    staleTime: 30 * 1000,
  });
};

export const useAdminTutorApplicationMetrics = (enabled = true) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.metrics(),
    queryFn: () => adminTutorApplicationApi.metrics(),
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useAdminTutorApplicationDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.detail(id),
    queryFn: () => adminTutorApplicationApi.detail(id),
    enabled: enabled && !!id,
  });
};

export const useApproveTutorApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTutorApplicationApi.approve(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.list(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.metrics(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(id),
      });
    },
  });
};

export const useRejectTutorApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTutorApplicationApi.reject(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.list(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.metrics(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(id),
      });
    },
  });
};

export const useCreateAdminNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminNotePayload) =>
      adminTutorApplicationApi.createAdminNote(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(variables.tutorId),
      });
    },
  });
};

export const useUpdateProfessionalDocumentStatus = (tutorId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProfessionalDocumentStatusPayload;
    }) =>
      adminTutorApplicationApi.updateProfessionalDocumentStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(tutorId),
      });
    },
  });
};

export const useUpdateIdentityVerificationStatus = (tutorId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateIdentityVerificationStatusPayload;
    }) =>
      adminTutorApplicationApi.updateIdentityVerificationStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(tutorId),
      });
    },
  });
};
