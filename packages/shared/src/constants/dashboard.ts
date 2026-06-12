import { ROUTES } from './routes';

export type DashboardMenuIconKey =
  | 'document'
  | 'complaints'
  | 'bookingRequests'
  | 'trialBookings'
  | 'calendar'
  | 'logout'
  | 'tutorApplications'
  | 'students'
  | 'payments'
  | 'wallet'
  | 'reports'
  | 'dashboard'
  | 'profile'
  | 'events'
  | 'adminPanel'
  | 'onboarding'
  | 'becomeTutor'
  | 'tutorPolicy'
  | 'settings';
export type DashboardMenuLabelKey =
  | 'myLessons'
  | 'pendingBookings'
  | 'complaints'
  | 'lessonComplaints'
  | 'trialBookings'
  | 'mySchedule'
  | 'logout'
  | 'tutorApplications'
  | 'students'
  | 'payments'
  | 'wallet'
  | 'reports'
  | 'dashboard'
  | 'profile'
  | 'events'
  | 'adminPanel'
  | 'onboarding'
  | 'becomeTutor'
  | 'tutorPolicy'
  | 'settings';

export const DASHBOARD_ROLES = ['STUDENT', 'TUTOR', 'ADMIN'] as const;
export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

export const DASHBOARD_ROLE_TITLES: Record<DashboardRole, string> = {
  STUDENT: 'Student Dashboard',
  TUTOR: 'Tutor Dashboard',
  ADMIN: 'Student Dashboard',
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
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    key: 'pending-bookings',
    type: 'link',
    labelKey: 'pendingBookings',
    iconKey: 'bookingRequests',
    href: ROUTES.DASHBOARD.PENDING_BOOKINGS,
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    key: 'complaints',
    type: 'link',
    labelKey: 'complaints',
    iconKey: 'complaints',
    href: ROUTES.DASHBOARD.COMPLAINTS,
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    key: 'tutor-profile',
    type: 'link',
    labelKey: 'profile',
    iconKey: 'profile',
    href: ROUTES.DASHBOARD.TUTOR_PROFILE,
    roles: ['TUTOR'],
  },
  {
    key: 'trial-bookings',
    type: 'link',
    labelKey: 'trialBookings',
    iconKey: 'trialBookings',
    href: ROUTES.DASHBOARD.TRIAL_BOOKING,
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
    key: 'tutor-lesson-complaints',
    type: 'link',
    labelKey: 'lessonComplaints',
    iconKey: 'complaints',
    href: ROUTES.DASHBOARD.TUTOR_LESSON_COMPLAINTS,
    roles: ['TUTOR'],
  },
  {
    key: 'wallet',
    type: 'link',
    labelKey: 'wallet',
    iconKey: 'wallet',
    href: ROUTES.DASHBOARD.WALLET,
    roles: ['STUDENT', 'TUTOR', 'ADMIN'],
  },
  {
    key: 'my-events',
    type: 'link',
    labelKey: 'events',
    iconKey: 'events',
    href: ROUTES.DASHBOARD.MY_EVENTS,
    roles: ['STUDENT', 'TUTOR', 'ADMIN'],
  },
  {
    key: 'settings',
    type: 'link',
    labelKey: 'settings',
    iconKey: 'settings',
    href: ROUTES.DASHBOARD.SETTINGS,
    roles: ['STUDENT', 'TUTOR', 'ADMIN'],
  },
  {
    key: 'become-tutor',
    type: 'link',
    labelKey: 'becomeTutor',
    iconKey: 'becomeTutor',
    href: ROUTES.BECOME_TUTOR.INDEX,
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    key: 'onboarding',
    type: 'link',
    labelKey: 'onboarding',
    iconKey: 'onboarding',
    href: ROUTES.SUPPORT.ONBOARDING,
    roles: ['STUDENT', 'TUTOR'],
  },
  {
    key: 'tutor-policy',
    type: 'link',
    labelKey: 'tutorPolicy',
    iconKey: 'tutorPolicy',
    href: ROUTES.SUPPORT.TUTOR_POLICY,
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

  return DASHBOARD_MENU_ITEMS.filter((item) => item.roles.includes(role as DashboardRole));
}

export function getDefaultDashboardHref(role: string | null | undefined): string {
  if (role === 'ADMIN') {
    return ROUTES.DASHBOARD.MY_LESSONS;
  }
  if (role === 'TUTOR') {
    return ROUTES.DASHBOARD.TUTOR_PROFILE;
  }
  if (role === 'STUDENT') {
    return ROUTES.DASHBOARD.MY_LESSONS;
  }
  return ROUTES.HOME.index;
}

export function isDashboardSidebarLinkActive(
  item: DashboardMenuItem,
  pathname: string | null,
): boolean {
  if (item.type !== 'link' || !pathname || !item.href) {
    return false;
  }
  if (pathname === item.href) {
    return true;
  }
  if (item.key === 'tutor-profile') {
    return pathname.startsWith(ROUTES.DASHBOARD.TUTOR_PROFILE);
  }
  if (item.key === 'trial-bookings') {
    return pathname.startsWith(ROUTES.DASHBOARD.TRIAL_BOOKING);
  }
  if (item.key === 'my-schedule') {
    return pathname.startsWith(ROUTES.DASHBOARD.MY_SCHEDULE);
  }
  if (item.key === 'tutor-lesson-complaints') {
    return pathname.startsWith(ROUTES.DASHBOARD.TUTOR_LESSON_COMPLAINTS);
  }
  if (item.key === 'my-lessons') {
    return pathname.startsWith(ROUTES.DASHBOARD.MY_LESSONS);
  }
  if (item.key === 'pending-bookings') {
    return pathname.startsWith(ROUTES.DASHBOARD.PENDING_BOOKINGS);
  }
  if (item.key === 'complaints') {
    return pathname.startsWith(ROUTES.DASHBOARD.COMPLAINTS);
  }
  if (item.key === 'wallet') {
    return pathname.startsWith(ROUTES.DASHBOARD.WALLET);
  }
  if (item.key === 'my-events') {
    return pathname.startsWith(ROUTES.DASHBOARD.MY_EVENTS);
  }
  if (item.key === 'settings') {
    return pathname.startsWith(ROUTES.DASHBOARD.SETTINGS);
  }
  if (item.key === 'become-tutor') {
    return pathname.startsWith(ROUTES.BECOME_TUTOR.INDEX);
  }
  if (item.key === 'onboarding') {
    return pathname.startsWith(ROUTES.SUPPORT.ONBOARDING);
  }
  if (item.key === 'tutor-policy') {
    return pathname.startsWith(ROUTES.SUPPORT.TUTOR_POLICY);
  }
  return false;
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
