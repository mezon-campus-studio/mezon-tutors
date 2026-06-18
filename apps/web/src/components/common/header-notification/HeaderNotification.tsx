'use client';

import { NOTIFICATION_I18N_NAMESPACE, NOTIFICATION_META, ROUTES } from '@mezon-tutors/shared';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtomValue } from 'jotai';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { HeaderNotificationItem } from '@/components/common/header-notification/HeaderNotificationItem';
import { Button, Spinner } from '@/components/ui';
import { useUserTimezone } from '@/hooks';
import { cn } from '@/lib/utils';
import { formatInstantForLocale } from '@/lib/timezone';
import type { NotificationItem } from '@/services/notification/notification.api';
import {
  useInfiniteNotifications,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
  useUnreadNotificationCount,
} from '@/services/notification/notification.api';
import { userAtom } from '@/store';

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

function buildNotificationTemplateParams(
  item: NotificationItem,
  userTimezone: string,
  locale: string,
): Record<string, string | number | Date> {
  const meta = item.metadata ?? {};
  const params: Record<string, string | number | Date> = {
    ...(item.i18nParams ?? {}),
  };

  const metaString = (key: string): string | undefined => {
    const fromParams = params[key];
    if (fromParams != null && String(fromParams).trim() !== '') {
      return String(fromParams);
    }
    const fromMeta = meta[key];
    if (typeof fromMeta === 'string' && fromMeta.trim() !== '') {
      return fromMeta;
    }
    return undefined;
  };

  for (const key of ['tutorName', 'reason', 'adminNote', 'amount', 'studentName', 'planLabel']) {
    const value = metaString(key);
    if (value != null) {
      params[key] = value;
    }
  }

  const startAtIso = metadataStartAtIso(meta);
  if (startAtIso) {
    params.lessonStartAt = formatInstantForLocale(startAtIso, userTimezone, locale);
  } else {
    const lessonStartAt = metaString('lessonStartAt');
    if (lessonStartAt != null) {
      params.lessonStartAt = lessonStartAt;
    }
  }

  if (item.i18nKey?.includes('lessonComplaintRejected') && params.adminNote == null) {
    params.adminNote = '—';
  }

  return params;
}

function canTranslateNotification(
  i18nKey: string | null | undefined,
  params: Record<string, string | number | Date>,
): boolean {
  if (!i18nKey) return false;
  if (!i18nKey.includes('lessonComplaint')) return true;
  if (!params.tutorName || !params.lessonStartAt) return false;
  if (i18nKey.includes('Rejected') && !params.reason) return false;
  if (i18nKey.includes('ApprovedRefunded') && !params.amount) return false;
  return true;
}

export function HeaderNotification({ enabled }: HeaderNotificationProps) {
  const router = useRouter();
  const user = useAtomValue(userAtom);
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

  const getNotificationMeta = (item: NotificationItem) => {
    if (item.i18nKey) {
      const matchedByTemplateKey = Object.values(NOTIFICATION_META).find(
        (meta) => meta.templateKey === item.i18nKey
      );
      if (matchedByTemplateKey) return matchedByTemplateKey;
    }
    const metadata = item.metadata ?? {};
    const titleI18nKey = typeof metadata.titleI18nKey === 'string' ? metadata.titleI18nKey : null;
    if (!titleI18nKey) return null;
    return Object.values(NOTIFICATION_META).find((meta) => meta.titleKey === titleI18nKey) ?? null;
  };

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
    const templateMeta = getNotificationMeta(item);
    return translateWithFallback(titleKey ?? templateMeta?.titleKey, rawParams, item.title);
  };

  const getNotificationContent = (item: (typeof notificationItems)[number]) => {
    const params = buildNotificationTemplateParams(item, userTimezone, locale);
    if (!item.i18nKey || !canTranslateNotification(item.i18nKey, params)) {
      return item.content;
    }
    return translateWithFallback(item.i18nKey, params, item.content);
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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
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

  const routeFromNotification = (item: NotificationItem): string | null => {
    const metadata = item.metadata ?? {};
    const bookingId = typeof metadata.bookingId === 'string' ? metadata.bookingId : null;
    const enrollmentId = typeof metadata.enrollmentId === 'string' ? metadata.enrollmentId : null;
    const complaintId = typeof metadata.complaintId === 'string' ? metadata.complaintId : null;
    const hasTutorContext = typeof metadata.tutorId === 'string' || typeof metadata.studentId === 'string';
    const templateMeta = getNotificationMeta(item);

    if (templateMeta) {
      return templateMeta.resolveLink({
        bookingId,
        enrollmentId,
        complaintId,
        role: user?.role ?? null,
      });
    }

    if (complaintId) return ROUTES.DASHBOARD.COMPLAINTS;
    if (bookingId && hasTutorContext) return ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(bookingId);
    if (bookingId || enrollmentId) return ROUTES.DASHBOARD.MY_LESSONS;
    return null;
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead && !markAsReadMutation.isPending) {
      markAsReadMutation.mutate(item.id);
    }

    const targetRoute = routeFromNotification(item);
    if (targetRoute) {
      setOpen(false);
      router.push(targetRoute);
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
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={getLabel('openAria', 'Open notifications')}
        onClick={() => setOpen((v) => !v)}
        className="relative size-9 rounded-full border-violet-200 bg-white text-slate-800 shadow-none transition-all duration-200 ease-out hover:-translate-y-px hover:border-violet-400 hover:bg-violet-50"
      >
        <span className="relative inline-flex items-center justify-center">
          <Bell
            className="size-4 text-violet-700"
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
          <section
            aria-label={getLabel('title', 'Notifications')}
            className={cn(
              'z-999 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white shadow-xl',
              'fixed top-14 right-4 left-4 max-h-[calc(100dvh-4rem)] p-3 sm:top-16 sm:p-4',
              'md:absolute md:top-11 md:right-0 md:left-auto md:w-[min(24rem,calc(100vw-2rem))] md:max-h-none md:p-4',
              'lg:w-[440px]',
            )}
          >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900 sm:text-lg">
                {getLabel('title', 'Notifications')}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 sm:hidden">
                {getLabel('unreadCount', `${unreadCount} unread`, {
                  count: unreadCount,
                })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              <span className="hidden text-[13px] text-slate-500 sm:inline">
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
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/50 transition hover:border-violet-300 hover:bg-violet-50 sm:h-10 sm:w-auto"
              >
                {getLabel('markAllAsRead', 'Mark all read')}
              </Button>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 max-h-[calc(100dvh-12rem)] md:max-h-[420px]"
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
                        typeLabel={getLabel(`types.${item.type}`, item.type)}
                        borderColor={getNotificationMeta(item)?.borderColor ?? '#94a3b8'}
                        onClickAction={handleItemClick}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {notificationsQuery.isFetchingNextPage ? (
              <div className="flex flex-col items-center justify-center gap-2 px-3 py-4">
                <Spinner />
                <p className="text-sm text-slate-500">
                  {getLabel('loadingMore', 'Loading more...')}
                </p>
              </div>
            ) : null}

            {notificationsQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8">
                <Spinner />
                <p className="text-sm text-slate-500">
                  {getLabel('loading', 'Loading notifications...')}
                </p>
              </div>
            ) : null}

            {notificationsQuery.isError ? (
              <div className="flex justify-center px-4 py-8">
                <p className="text-center text-sm text-red-600">
                  {getLabel('loadError', 'Cannot load notifications. Please try again.')}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
