'use client';

import { ENotificationType, NOTIFICATION_I18N_NAMESPACE } from '@mezon-tutors/shared';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Bell } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { HeaderNotificationItem } from '@/components/common/header-notification/HeaderNotificationItem';
import { Button, Spinner } from '@/components/ui';
import { useUserTimezone } from '@/hooks';
import { formatInstantForLocale } from '@/lib/timezone';
import type { NotificationItem } from '@/services/notification/notification.api';
import {
  useInfiniteNotifications,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
  useUnreadNotificationCount,
} from '@/services/notification/notification.api';

const PAGE_SIZE = 20;
const ESTIMATED_ITEM_HEIGHT = 128;

type HeaderNotificationProps = {
  enabled: boolean;
};

function metadataStartAtIso(metadata: Record<string, unknown> | null): string | null {
  if (!metadata || typeof metadata.startAt !== 'string') {
    return null;
  }
  return metadata.startAt;
}

function withViewerTimezoneParams(
  item: NotificationItem,
  params: Record<string, string | number | Date>,
  userTimezone: string,
  locale: string,
): Record<string, string | number | Date> {
  const startAtIso = metadataStartAtIso(item.metadata);
  if (!startAtIso) {
    return params;
  }
  return {
    ...params,
    lessonStartAt: formatInstantForLocale(startAtIso, userTimezone, locale),
  };
}

export function HeaderNotification({ enabled }: HeaderNotificationProps) {
  const locale = useLocale();
  const userTimezone = useUserTimezone();
  const t = useTranslations(NOTIFICATION_I18N_NAMESPACE);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const unreadCountQuery = useUnreadNotificationCount(enabled);
  const notificationsQuery = useInfiniteNotifications(PAGE_SIZE, enabled && open);
  const markAsReadMutation = useMarkNotificationAsReadMutation(PAGE_SIZE);
  const markAllAsReadMutation = useMarkAllNotificationsAsReadMutation(PAGE_SIZE);

  const notificationItems = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data]
  );

  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;

  const fallbackByType: Record<ENotificationType, string> = {
    [ENotificationType.BOOKING]: 'Booking',
    [ENotificationType.PAYMENT]: 'Payment',
    [ENotificationType.SYSTEM]: 'System',
    [ENotificationType.LESSON_STARTING_SOON]: 'Lesson reminder',
  };

  const translateWithFallback = (
    key: string | undefined | null,
    params: Record<string, string | number | Date> | null | undefined,
    fallback: string
  ) => {
    if (!key) return fallback;
    try {
      return t(key as never, (params ?? {}) as never);
    } catch {
      return fallback;
    }
  };

  const getLabel = (
    key: string,
    fallback: string,
    params?: Record<string, string | number | Date>
  ) => translateWithFallback(key, params, fallback);

  const getNotificationTitle = (item: (typeof notificationItems)[number]) => {
    const meta = item.metadata;
    const titleKey =
      meta &&
      typeof meta === 'object' &&
      'titleI18nKey' in meta &&
      typeof meta.titleI18nKey === 'string'
        ? meta.titleI18nKey
        : null;
    const hasTitleParams =
      meta &&
      typeof meta === 'object' &&
      'titleI18nParams' in meta &&
      meta.titleI18nParams !== null &&
      typeof meta.titleI18nParams === 'object';
    const rawParams = hasTitleParams
      ? (meta.titleI18nParams as Record<string, string | number | Date>)
      : {};
    return translateWithFallback(
      titleKey,
      withViewerTimezoneParams(item, rawParams, userTimezone, locale),
      item.title,
    );
  };

  const getNotificationContent = (item: (typeof notificationItems)[number]) => {
    const startAtIso = metadataStartAtIso(item.metadata);
    if (!startAtIso || !item.i18nKey) {
      return translateWithFallback(item.i18nKey, item.i18nParams, item.content);
    }
    return translateWithFallback(
      item.i18nKey,
      withViewerTimezoneParams(item, item.i18nParams ?? {}, userTimezone, locale),
      item.content,
    );
  };

  const rowVirtualizer = useVirtualizer({
    count: notificationItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: 5,
  });

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const remaining = scrollHeight - scrollTop - clientHeight;
    if (
      remaining < 80 &&
      notificationsQuery.hasNextPage &&
      !notificationsQuery.isFetchingNextPage
    ) {
      void notificationsQuery.fetchNextPage();
    }
  };

  const handleItemClick = (id: string, isRead: boolean) => {
    if (!isRead && !markAsReadMutation.isPending) {
      markAsReadMutation.mutate(id);
    }
  };

  return (
    <div
      className="relative"
      ref={wrapperRef}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={getLabel('openAria', 'Open notifications')}
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 rounded-full border-slate-200 bg-white px-3 text-slate-800 shadow-none transition-all duration-200 ease-out hover:-translate-y-px hover:border-violet-400 hover:bg-violet-50"
      >
        <span className="relative inline-flex items-center justify-center">
          <Bell
            className="size-4 text-slate-500"
            aria-hidden
          />
          {unreadCount > 0 ? (
            <span className="absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </span>
      </Button>

      {open ? (
        <div
          className="absolute top-11 right-0 z-999 flex w-[440px] max-w-[96vw] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-slate-900">{getLabel('title', 'Notifications')}</p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[13px] text-slate-500">
                {getLabel('unreadCount', `${unreadCount} unread`, {
                  count: unreadCount,
                })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                onClick={() => {
                  if (unreadCount > 0) {
                    markAllAsReadMutation.mutate();
                  }
                }}
              >
                {getLabel('markAllAsRead', 'Mark all read')}
              </Button>
            </div>
          </div>

          <div
            className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200"
            ref={listRef}
            onScroll={handleListScroll}
          >
            {notificationItems.length === 0 && !notificationsQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center px-6 py-10">
                <p className="text-center text-sm text-slate-500">
                  {getLabel('empty', 'No notifications yet')}
                </p>
              </div>
            ) : null}

            {notificationItems.length > 0 ? (
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = notificationItems[virtualRow.index];
                  if (!item) return null;
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <HeaderNotificationItem
                        item={item}
                        locale={locale}
                        userTimezone={userTimezone}
                        title={getNotificationTitle(item)}
                        content={getNotificationContent(item)}
                        typeLabel={getLabel(`types.${item.type}`, fallbackByType[item.type])}
                        onClickAction={handleItemClick}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {notificationsQuery.isFetchingNextPage ? (
              <div className="flex justify-center px-3 py-3">
                <Spinner />
                <p className="text-sm text-slate-500">
                  {getLabel('loadingMore', 'Loading more...')}
                </p>
              </div>
            ) : null}

            {notificationsQuery.isLoading ? (
              <div className="flex justify-center px-4 py-6">
                <Spinner />
                <p className="text-sm text-slate-500">
                  {getLabel('loading', 'Loading notifications...')}
                </p>
              </div>
            ) : null}

            {notificationsQuery.isError ? (
              <div className="flex justify-center px-4 py-6">
                <p className="text-sm text-red-600">
                  {getLabel('loadError', 'Cannot load notifications. Please try again.')}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
