import { ROUTES } from './routes';

export type AdminMenuKey =
  | 'tutorApplications'
  | 'lessonComplaints'
  | 'appSettings'
  | 'students'
  | 'payments'
  | 'reports';

export type AdminMenuItem = {
  key: AdminMenuKey;
  labelKey: AdminMenuKey;
  iconKey: AdminMenuKey;
  href: string;
};

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    key: 'tutorApplications',
    labelKey: 'tutorApplications',
    iconKey: 'tutorApplications',
    href: ROUTES.ADMIN.TUTOR_APPLICATIONS,
  },
  {
    key: 'lessonComplaints',
    labelKey: 'lessonComplaints',
    iconKey: 'lessonComplaints',
    href: ROUTES.ADMIN.LESSON_COMPLAINTS,
  },
  {
    key: 'appSettings',
    labelKey: 'appSettings',
    iconKey: 'appSettings',
    href: ROUTES.ADMIN.APP_SETTINGS,
  },
  {
    key: 'students',
    labelKey: 'students',
    iconKey: 'students',
    href: '#',
  },
  {
    key: 'payments',
    labelKey: 'payments',
    iconKey: 'payments',
    href: ROUTES.ADMIN.PAYMENTS,
  },
  {
    key: 'reports',
    labelKey: 'reports',
    iconKey: 'reports',
    href: '#',
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
