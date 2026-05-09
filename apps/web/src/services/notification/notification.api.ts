import type { ApiResponse, ENotificationType } from "@mezon-tutors/shared";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { notificationQueryKey } from "./notification.qkey";

export type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: ENotificationType;
  i18nKey: string | null;
  i18nParams: Record<string, string | number | Date> | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  pagination: {
    skip: number;
    take: number;
    total: number;
    hasMore: boolean;
    nextSkip: number | null;
  };
};

type NotificationUnreadCountResponse = {
  unreadCount: number;
};

type GetMyNotificationParams = {
  skip: number;
  take: number;
};

export const notificationApi = {
  getMyNotifications(
    params: GetMyNotificationParams,
  ): Promise<NotificationListResponse> {
    return apiClient.get<
      ApiResponse<NotificationListResponse>,
      NotificationListResponse
    >("/notifications", { params });
  },

  markAsRead(recipientId: string): Promise<{ success: boolean }> {
    return apiClient.patch<
      ApiResponse<{ success: boolean }>,
      { success: boolean }
    >(`/notifications/${recipientId}/read`);
  },

  markAllAsRead(): Promise<{ success: boolean }> {
    return apiClient.patch<
      ApiResponse<{ success: boolean }>,
      { success: boolean }
    >("/notifications/read-all");
  },

  getUnreadCount(): Promise<NotificationUnreadCountResponse> {
    return apiClient.get<
      ApiResponse<NotificationUnreadCountResponse>,
      NotificationUnreadCountResponse
    >("/notifications/unread-count");
  },
};

export function useInfiniteNotifications(take = 20, enabled = true) {
  return useInfiniteQuery({
    queryKey: notificationQueryKey.infinite(take),
    queryFn: ({ pageParam }) =>
      notificationApi.getMyNotifications({
        skip: pageParam,
        take,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (
        !lastPage.pagination.hasMore ||
        lastPage.pagination.nextSkip == null
      ) {
        return undefined;
      }
      return lastPage.pagination.nextSkip;
    },
    enabled,
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: notificationQueryKey.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

export function useMarkNotificationAsReadMutation(take = 20) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipientId: string) =>
      notificationApi.markAsRead(recipientId),
    onSuccess: (_, recipientId) => {
      queryClient.setQueryData<InfiniteData<NotificationListResponse>>(
        notificationQueryKey.infinite(take),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === recipientId ? { ...item, isRead: true } : item,
              ),
            })),
          };
        },
      );
      queryClient.setQueryData<NotificationUnreadCountResponse>(
        notificationQueryKey.unreadCount(),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            unreadCount: Math.max(0, oldData.unreadCount - 1),
          };
        },
      );
    },
  });
}

export function useMarkAllNotificationsAsReadMutation(take = 20) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<InfiniteData<NotificationListResponse>>(
        notificationQueryKey.infinite(take),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => ({ ...item, isRead: true })),
            })),
          };
        },
      );
      queryClient.setQueryData<NotificationUnreadCountResponse>(
        notificationQueryKey.unreadCount(),
        () => ({ unreadCount: 0 }),
      );
    },
  });
}
