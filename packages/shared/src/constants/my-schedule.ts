export type SessionStatus = 'upcoming' | 'pending' | 'available' | 'blocked';

export const ALL_SESSION_STATUSES: SessionStatus[] = ['upcoming', 'pending', 'available', 'blocked'];

export const DEFAULT_TIMEZONE = 'UTC';

export const PENDING_STUDENT_ID = 'mezon-pending-1';

export const DEFAULT_AVAILABILITY_SLOT = {
  startTime: '09:00',
  endTime: '17:00',
} as const;

export const AVAILABILITY_EDITOR_CONFIG = {
  iconSize: 24,
  titleFontSize: 18,
  arrowIconSize: 25,
  trashIconSize: 18,
  plusIconSize: 20,
  labelFontSize: 13,
  timePickerMinWidth: 120,
} as const;

export function getStatusLabelKey(status: SessionStatus): string {
  switch (status) {
    case 'upcoming':
      return 'upcomingSession';
    case 'pending':
      return 'pendingRequest';
    case 'available':
      return 'availableSlot';
    case 'blocked':
      return 'blockedBreak';
  }
}

export function getStatusTokenName(status: SessionStatus, suffix: 'Bg' | 'Label' | 'Dot' | 'BadgeText'): `$myScheduleStatus${string}` {
  const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
  return `$myScheduleStatus${capitalizedStatus}${suffix}` as `$myScheduleStatus${string}`;
}

export const MY_SCHEDULE_EVENT_CARD_CONFIG = {
  borderRadius: 12,
  borderLeftWidth: 4,
  available: {
    compact: {
      minHeight: 50,
      fontSize: 11,
      lineHeight: 13,
    },
    normal: {
      minHeight: 56,
      fontSize: 11,
      lineHeight: 13,
    },
  },
  event: {
    compact: {
      minHeight: 70,
      maxHeight: 78,
      fontSize: 13,
      lineHeight: 15,
      timeFontSize: 10,
      timeLineHeight: 12,
    },
    normal: {
      minHeight: 80,
      maxHeight: 88,
      fontSize: 14,
      lineHeight: 16,
      timeFontSize: 10,
      timeLineHeight: 12,
    },
  },
} as const;
