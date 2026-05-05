'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { CheckCircle2, Clock3, RefreshCw, Loader2, type LucideIcon } from 'lucide-react';
import { ROUTES, VerificationStatus } from '@mezon-tutors/shared';
import { useGetMyTutorProfileStatus } from '@/services';

type StatusMeta = {
  icon: LucideIcon;
  badge: string;
};

type StatusLayoutProps = {
  statusMeta: StatusMeta;
  statusLabel: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

function StatusLayout({ statusMeta, statusLabel, title, description, children }: StatusLayoutProps) {
  const StatusIcon = statusMeta.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="min-h-[70vh] flex items-center px-4 md:px-6">
        <div className="max-w-[1200px] w-full mx-auto">
          <div className="py-8 md:py-10 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center justify-center gap-2.5">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${statusMeta.badge}`}>
                <StatusIcon className="h-4 w-4" />
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusMeta.badge}`}>
                {statusLabel}
              </span>
            </div>
            <h1 className="text-[34px] md:text-[40px] font-bold tracking-tight text-slate-900 md:whitespace-nowrap">
              {title}
            </h1>
            <p className="mt-2.5 max-w-[1050px] text-lg md:text-2xl leading-8 md:leading-[1.35] text-slate-600">
              {description}
            </p>
            {children && <div className="mt-6">{children}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinalPage() {
  const t = useTranslations('TutorProfile.EntryStatus');
  const router = useRouter();
  const { data, isLoading } = useGetMyTutorProfileStatus();

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-[70vh] flex items-center justify-center px-4 md:px-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data.hasProfile) {
    return null;
  }

  const status = data.verificationStatus;
  const statusMeta =
    status === VerificationStatus.PENDING
      ? {
          icon: Clock3,
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
        }
      : status === VerificationStatus.APPROVED
        ? {
            icon: CheckCircle2,
            badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          }
        : {
            icon: RefreshCw,
            badge: 'bg-rose-100 text-rose-700 border-rose-200',
          };

  if (status === VerificationStatus.PENDING) {
    return (
      <StatusLayout
        statusMeta={statusMeta}
        statusLabel={t('pending.status')}
        title={t('pending.title')}
        description={t('pending.description')}
      />
    );
  }

  if (status === VerificationStatus.APPROVED) {
    return (
      <StatusLayout
        statusMeta={statusMeta}
        statusLabel={t('approved.status')}
        title={t('approved.title')}
        description={t('approved.description')}
      >
        <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center sm:flex-wrap">
          <Button
            size="lg"
            className="h-10 rounded-xl bg-indigo-600 px-6 text-sm text-white hover:bg-indigo-700"
            onClick={() => router.push(ROUTES.DASHBOARD.BOOKING_REQUESTS)}
          >
            {t('approved.bookingRequests')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-10 rounded-xl border-slate-300 bg-white/70 px-6 text-sm text-slate-800 hover:bg-white"
            onClick={() => router.push(ROUTES.DASHBOARD.MY_SCHEDULE)}
          >
            {t('approved.mySchedule')}
          </Button>
        </div>
      </StatusLayout>
    );
  }

  if (status === VerificationStatus.REJECTED) {
    return (
      <StatusLayout
        statusMeta={statusMeta}
        statusLabel={t('rejected.status')}
        title={t('rejected.title')}
        description={t('rejected.description')}
      >
        <Button
          size="lg"
          className="h-10 rounded-xl bg-indigo-600 px-6 text-sm text-white hover:bg-indigo-700"
          onClick={() => router.push('/become-tutor/about')}
        >
          {t('rejected.restart')}
        </Button>
      </StatusLayout>
    );
  }

  return null;
}
