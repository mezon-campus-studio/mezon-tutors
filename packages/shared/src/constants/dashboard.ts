import { ROUTES } from './routes';

export type DashboardMenuIconKey = 'document' | 'bookingRequests' | 'calendar' | 'logout';
export type DashboardMenuLabelKey = 'myLessons' | 'bookingRequests' | 'mySchedule' | 'logout';

export const DASHBOARD_ROLES = ['STUDENT', 'TUTOR', 'ADMIN'] as const;
export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

export const DASHBOARD_ROLE_TITLES: Record<DashboardRole, string> = {
  STUDENT: 'Student Dashboard',
  TUTOR: 'Tutor Dashboard',
  ADMIN: 'Admin Dashboard',
};

export type DashboardMenuItem = {
  key: string;
  type: 'link' | 'action';
  labelKey: DashboardMenuLabelKey;
  iconKey: DashboardMenuIconKey;
  href?: string;
  roles: DashboardRole[];
};

export const DASHBOARD_MENU_ITEMS: DashboardMenuItem[] = [
  {
    key: 'my-lessons',
    type: 'link',
    labelKey: 'myLessons',
    iconKey: 'document',
    href: ROUTES.DASHBOARD.MY_LESSONS,
    roles: ['STUDENT'],
  },
  {
    key: 'booking-requests',
    type: 'link',
    labelKey: 'bookingRequests',
    iconKey: 'bookingRequests',
    href: ROUTES.DASHBOARD.BOOKING_REQUESTS,
    roles: ['TUTOR'],
  },
  {
    key: 'my-schedule',
    type: 'link',
    labelKey: 'mySchedule',
    iconKey: 'calendar',
    href: ROUTES.DASHBOARD.MY_SCHEDULE,
    roles: ['TUTOR'],
  },
  {
    key: 'logout',
    type: 'action',
    labelKey: 'logout',
    iconKey: 'logout',
    roles: ['STUDENT', 'TUTOR', 'ADMIN'],
  },
];

export function isDashboardRole(role: string | null | undefined): role is DashboardRole {
  if (!role) {
    return false;
  }

  return DASHBOARD_ROLES.includes(role as DashboardRole);
}

export function getDashboardMenuItemsByRole(role: string | null | undefined): DashboardMenuItem[] {
  if (!isDashboardRole(role)) {
    return [];
  }

  return DASHBOARD_MENU_ITEMS.filter((item) => item.roles.includes(role));
}

export const DASHBOARD_SIDEBAR_CONFIG = {
  width: 240,
  padding: {
    container: 16,
    item: {
      vertical: 8,
      horizontal: 12,
    },
  },
  borderRadius: 12,
  iconSizes: {
    default: 16,
    bookingRequests: 19,
  },
} as const;

export const DASHBOARD_ICON_MAP = {
  document: 'DocumentIcon',
  bookingRequests: 'BookingRequestIcon',
  calendar: 'CalendarIcon',
  logout: 'LogoutIcon',
} as const;

export type MenuDisplayOptions = {
  pathname: string;
  activeIconColor: string;
  inactiveIconColor: string;
  logoutIconColor: string;
};

export function getDashboardMenuItemDisplay(item: DashboardMenuItem, options: MenuDisplayOptions) {
  const active = item.type === 'link' && !!item.href && options.pathname === item.href;
  const isLogoutItem = item.type === 'action';

  return {
    active,
    iconKey: item.iconKey,
    iconColor: isLogoutItem
      ? options.logoutIconColor
      : active
        ? options.activeIconColor
        : options.inactiveIconColor,
    labelColor: isLogoutItem
      ? '$myLessonsSidebarLogoutText'
      : active
        ? '$dashboardTutorFilterActiveBg'
        : '$dashboardTutorTextSecondary',
  };
}
