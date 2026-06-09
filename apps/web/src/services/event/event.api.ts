import type {
  CreateEventPayload,
  EventDetailDto,
  EventListItemDto,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, publicApiClient } from "@/services/api-client";
import { eventQueryKey } from "./event.qkey";

const BASE = "/events";

export const eventApi = {
  listPublished: () => publicApiClient.get<EventListItemDto[]>(BASE),
  getBySlug: (slug: string) =>
    publicApiClient.get<EventDetailDto>(`${BASE}/${encodeURIComponent(slug)}`),
  create: (payload: CreateEventPayload) =>
    apiClient.post<EventDetailDto>(BASE, payload),
  listMySubmissions: () =>
    apiClient.get<EventListItemDto[]>(`${BASE}/submissions/mine`),
  getMySubmission: (id: string) =>
    apiClient.get<EventDetailDto>(`${BASE}/submissions/mine/${encodeURIComponent(id)}`),
  updateMySubmission: (id: string, payload: CreateEventPayload) =>
    apiClient.patch<EventDetailDto>(
      `${BASE}/submissions/mine/${encodeURIComponent(id)}`,
      payload,
    ),
};

export const usePublishedEvents = (enabled = true) =>
  useQuery({
    queryKey: eventQueryKey.list(),
    queryFn: () => eventApi.listPublished(),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

export const useEventDetail = (slug: string, enabled = true) =>
  useQuery({
    queryKey: eventQueryKey.detail(slug),
    queryFn: () => eventApi.getBySlug(slug),
    enabled: enabled && Boolean(slug),
  });

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => eventApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventQueryKey.all });
    },
  });
};

export const useMyEventSubmissions = (enabled = true) =>
  useQuery({
    queryKey: eventQueryKey.mySubmissions(),
    queryFn: () => eventApi.listMySubmissions(),
    enabled,
  });

export const useMyEventSubmission = (id: string, enabled = true) =>
  useQuery({
    queryKey: eventQueryKey.mySubmission(id),
    queryFn: () => eventApi.getMySubmission(id),
    enabled: enabled && Boolean(id),
  });

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateEventPayload }) =>
      eventApi.updateMySubmission(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: eventQueryKey.all });
      queryClient.invalidateQueries({
        queryKey: eventQueryKey.mySubmission(variables.id),
      });
    },
  });
};
