export const notificationQueryKey = {
  infinite: (take: number) => ["notifications", "infinite", take] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};
