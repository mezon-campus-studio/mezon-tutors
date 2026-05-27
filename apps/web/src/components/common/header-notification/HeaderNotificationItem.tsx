'use client';

import { ENotificationType } from '@mezon-tutors/shared';
import { formatInstantForLocale } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/services/notification/notification.api';

type HeaderNotificationItemProps = {
  item: NotificationItem;
  locale: string;
  userTimezone: string;
  typeLabel: string;
  title: string;
  content: string;
  onClickAction: (id: string, isRead: boolean) => void;
};

function typeBorderClass(type: ENotificationType): string {
  switch (type) {
    case ENotificationType.BOOKING:
      return 'border-l-blue-400';
    case ENotificationType.PAYMENT:
      return 'border-l-green-400';
    case ENotificationType.SYSTEM:
      return 'border-l-primary';
    case ENotificationType.LESSON_STARTING_SOON:
      return 'border-l-orange-400';
    default:
      return 'border-l-slate-200';
  }
}

export function HeaderNotificationItem({
  item,
  locale,
  userTimezone,
  typeLabel,
  title,
  content,
  onClickAction,
}: HeaderNotificationItemProps) {
  return (
    <button
      type="button"
      className="block w-full cursor-pointer text-left"
      onClick={() => onClickAction(item.id, item.isRead)}
    >
      <div
        className={cn(
          'flex flex-col gap-2 border-b border-slate-200 border-l-4 p-3 pl-3',
          typeBorderClass(item.type),
          item.isRead ? 'bg-transparent' : 'bg-sky-50'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              'min-w-0 flex-1 leading-5',
              item.isRead ? 'font-medium text-slate-800' : 'font-bold text-slate-900'
            )}
          >
            {title}
          </p>
          {!item.isRead ? (
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="text-xs font-semibold text-blue-700">{typeLabel}</p>
        <p className="text-sm leading-5 text-slate-600">{content}</p>
        <p className="text-xs text-slate-500">
          {formatInstantForLocale(item.createdAt, userTimezone, locale)}
        </p>
      </div>
    </button>
  );
}
