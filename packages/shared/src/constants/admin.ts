import { ROUTES } from './routes';

export type AdminMenuKey =
  | 'tutorApplications'
  | 'lessonComplaints'
  | 'events'
  | 'blogs'
  | 'appSettings'
  | 'students'
  | 'payments'
  | 'transactions'
  | 'reports';

export type AdminMenuItem = {
  key: AdminMenuKey;
  labelKey: AdminMenuKey;
  iconKey: AdminMenuKey;
  href: string;
  allowedRoles: AdminRole[];
};

export const ADMIN_ROLES = ['ADMIN', 'CTV'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    key: 'tutorApplications',
    labelKey: 'tutorApplications',
    iconKey: 'tutorApplications',
    href: ROUTES.ADMIN.TUTOR_APPLICATIONS,
    allowedRoles: ['ADMIN', 'CTV'],
  },
  {
    key: 'lessonComplaints',
    labelKey: 'lessonComplaints',
    iconKey: 'lessonComplaints',
    href: ROUTES.ADMIN.LESSON_COMPLAINTS,
    allowedRoles: ['ADMIN', 'CTV'],
  },
  {
    key: 'events',
    labelKey: 'events',
    iconKey: 'events',
    href: ROUTES.ADMIN.EVENTS,
    allowedRoles: ['ADMIN', 'CTV'],
  },
  {
    key: 'blogs',
    labelKey: 'blogs',
    iconKey: 'blogs',
    href: ROUTES.ADMIN.BLOGS,
    allowedRoles: ['ADMIN', 'CTV'],
  },
  {
    key: 'appSettings',
    labelKey: 'appSettings',
    iconKey: 'appSettings',
    href: ROUTES.ADMIN.APP_SETTINGS,
    allowedRoles: ['ADMIN'],
  },
  {
    key: 'payments',
    labelKey: 'payments',
    iconKey: 'payments',
    href: ROUTES.ADMIN.PAYMENTS,
    allowedRoles: ['ADMIN'],
  },
  {
    key: 'transactions',
    labelKey: 'transactions',
    iconKey: 'transactions',
    href: ROUTES.ADMIN.TRANSACTIONS,
    allowedRoles: ['ADMIN'],
  },
  {
    key: 'reports',
    labelKey: 'reports',
    iconKey: 'reports',
    href: ROUTES.ADMIN.COMMUNITY_REPORTS,
    allowedRoles: ['ADMIN', 'CTV'],
  },
];

export const ADMIN_TUTOR_APPLICATION_PAGE_SIZE = 10;

export const ADMIN_TUTOR_APPLICATION_STATUS_FILTERS = [
  'all',
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;

export type AdminTutorApplicationStatusFilter =
  (typeof ADMIN_TUTOR_APPLICATION_STATUS_FILTERS)[number];

export function isAdminRole(role: string | null | undefined): role is 'ADMIN' {
  return role === 'ADMIN';
}

export function isAdminOrCtvRole(
  role: string | null | undefined,
): role is AdminRole {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as AdminRole);
}

export function getAdminMenuItemsByRole(
  role: string | null | undefined,
): AdminMenuItem[] {
  if (!role) return [];
  return ADMIN_MENU_ITEMS.filter((item) =>
    item.allowedRoles.includes(role as AdminRole),
  );
}
