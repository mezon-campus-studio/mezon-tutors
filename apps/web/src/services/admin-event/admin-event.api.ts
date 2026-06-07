import type {
  EventDetailDto,
  EventListItemDto,
  EventMetricsDto,
  EventPublishStatusFilter,
  RejectEventPayload,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { eventQueryKey } from "../event/event.qkey";
import { adminEventQueryKey } from "./admin-event.qkey";

const BASE = "/admin/events";

export const adminEventApi = {
  list: (status?: EventPublishStatusFilter) =>
    apiClient.get<EventListItemDto[]>(
      status && status !== "all" ? `${BASE}?status=${status}` : BASE,
    ),
  metrics: () => apiClient.get<EventMetricsDto>(`${BASE}/metrics`),
  getById: (id: string) => apiClient.get<EventDetailDto>(`${BASE}/${id}`),
  publish: (id: string) => apiClient.post<EventDetailDto>(`${BASE}/${id}/publish`),
  reject: (id: string, payload: RejectEventPayload) =>
    apiClient.post<EventDetailDto>(`${BASE}/${id}/reject`, payload),
  close: (id: string) => apiClient.post<EventDetailDto>(`${BASE}/${id}/close`),
  approveUpdate: (id: string) =>
    apiClient.post<EventDetailDto>(`${BASE}/${id}/approve-update`),
  rejectUpdate: (id: string, payload: RejectEventPayload) =>
    apiClient.post<EventDetailDto>(`${BASE}/${id}/reject-update`, payload),
};

export const useAdminEvents = (
  status?: EventPublishStatusFilter,
  enabled = true,
) =>
  useQuery({
    queryKey: adminEventQueryKey.list(status),
    queryFn: () => adminEventApi.list(status),
    enabled,
  });

export const useAdminEventMetrics = (enabled = true) =>
  useQuery({
    queryKey: adminEventQueryKey.metrics(),
    queryFn: () => adminEventApi.metrics(),
    enabled,
  });

export const useAdminEventDetail = (id: string, enabled = true) =>
  useQuery({
    queryKey: adminEventQueryKey.detail(id),
    queryFn: () => adminEventApi.getById(id),
    enabled: enabled && Boolean(id),
  });

export const usePublishEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminEventApi.publish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventQueryKey.all });
    },
  });
};

export const useRejectEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminEventApi.reject(id, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventQueryKey.all });
    },
  });
};

export const useCloseEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminEventApi.close(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventQueryKey.all });
    },
  });
};

export const useApproveEventUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminEventApi.approveUpdate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventQueryKey.all });
    },
  });
};

export const useRejectEventUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminEventApi.rejectUpdate(id, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventQueryKey.all });
    },
  });
};
