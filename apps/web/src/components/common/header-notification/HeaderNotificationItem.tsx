'use client';

import { formatInstantForLocale } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/services/notification/notification.api';
import type { CSSProperties } from 'react';

type HeaderNotificationItemProps = {
  item: NotificationItem;
  locale: string;
  userTimezone: string;
  typeLabel: string;
  borderColor: string;
  title: string;
  content: string;
  onClickAction: (item: NotificationItem) => void;
};

export function HeaderNotificationItem({
  item,
  locale,
  userTimezone,
  typeLabel,
  borderColor,
  title,
  content,
  onClickAction,
}: HeaderNotificationItemProps) {
  const borderStyle: CSSProperties = {
    borderLeftColor: borderColor,
  };

  return (
    <button
      type="button"
      className="block w-full cursor-pointer text-left"
      onClick={() => onClickAction(item)}
    >
      <div
        className={cn('flex flex-col gap-2 border-b border-slate-200 border-l-4 p-3 pl-3', item.isRead ? 'bg-transparent' : 'bg-sky-50')}
        style={borderStyle}
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
