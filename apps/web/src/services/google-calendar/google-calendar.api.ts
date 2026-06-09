import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  GoogleCalendarConnectionStatus,
  GoogleCalendarSyncResult,
} from '@mezon-tutors/shared';
import { apiClient } from '../api-client';
import { googleCalendarQueryKey } from './google-calendar.qkey';

export const googleCalendarApi = {
  getOAuthAuthorizeUrl(returnTo: string): Promise<{ url: string }> {
    const params = new URLSearchParams({ returnTo });
    return apiClient.get<{ url: string }>(
      `/google-calendar/oauth/authorize-url?${params.toString()}`,
    );
  },

  getStatus(): Promise<GoogleCalendarConnectionStatus> {
    return apiClient.get<GoogleCalendarConnectionStatus>('/google-calendar/status');
  },

  disconnect(): Promise<void> {
    return apiClient.delete('/google-calendar/disconnect');
  },

  syncLessons(): Promise<GoogleCalendarSyncResult> {
    return apiClient.post<GoogleCalendarSyncResult>('/google-calendar/sync');
  },
};

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: googleCalendarQueryKey.status(),
    queryFn: () => googleCalendarApi.getStatus(),
    staleTime: 30_000,
  });
}

export function useSyncGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleCalendarApi.syncLessons(),
    onSuccess: (result) => {
      queryClient.setQueryData<GoogleCalendarConnectionStatus>(
        googleCalendarQueryKey.status(),
        (current) =>
          current
            ? {
                ...current,
                connected: true,
                needsReconnect: false,
                lastSyncedAt: result.lastSyncedAt,
              }
            : current,
      );
      void queryClient.invalidateQueries({ queryKey: googleCalendarQueryKey.status() });
    },
  });
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleCalendarApi.disconnect(),
    onSuccess: () => {
      queryClient.setQueryData<GoogleCalendarConnectionStatus>(
        googleCalendarQueryKey.status(),
        {
          connected: false,
          googleEmail: null,
          lastSyncedAt: null,
          needsReconnect: false,
        },
      );
    },
  });
}
