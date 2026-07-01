'use client';

import type { ReactNode } from 'react';
import { ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import type { WalletDetailsApiResponse } from '@mezon-tutors/shared';
import { Skeleton } from '@/components/ui';
import { userAtom } from '@/store';

type WalletBalanceCardProps = {
  details: WalletDetailsApiResponse | undefined;
  isPending?: boolean;
};

type BalanceCardShellProps = {
  children: ReactNode;
  accent?: 'emerald' | 'amber' | 'violet';
};

function BalanceCardShell({ children, accent = 'violet' }: BalanceCardShellProps) {
  const accentGlow =
    accent === 'emerald'
      ? 'bg-emerald-400/25'
      : accent === 'amber'
        ? 'bg-amber-400/25'
        : 'bg-fuchsia-400/20';

  return (
    <div className="relative min-h-[140px] overflow-hidden rounded-3xl border border-white/20 bg-brand-gradient-135 p-6 text-white shadow-xl shadow-violet-500/30 md:min-h-[160px] md:p-7">
      <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-white/10 blur-2xl" />
      <div
        className={`pointer-events-none absolute -bottom-16 right-1/4 size-48 rounded-full blur-3xl ${accentGlow}`}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function SecuredBadge({ label }: { label: string }) {
  return (
    <div className="absolute top-0 right-0 z-10 flex items-center gap-1.5 rounded-full border border-primary/40 bg-white/10 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
      <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
      {label}
    </div>
  );
}

function CurrencyLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-violet-100/90">
      <Sparkles className="size-4 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

function TutorBalanceCards({
  details,
  currencyLabel,
  availableLabel,
  pendingLabel,
}: {
  details: WalletDetailsApiResponse;
  currencyLabel: string;
  availableLabel: string;
  pendingLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <BalanceCardShell accent="emerald">
        <CurrencyLabel label={currencyLabel} />
        <p className="mt-3 text-sm font-medium text-emerald-200/95">{availableLabel}</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-300 md:text-4xl">
          {formatToCurrency(ECurrency.VND, details.availableBalance)}
        </p>
      </BalanceCardShell>
      <BalanceCardShell accent="amber">
        <CurrencyLabel label={currencyLabel} />
        <p className="mt-3 text-sm font-medium text-amber-200/95">{pendingLabel}</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-amber-300 md:text-4xl">
          {formatToCurrency(ECurrency.VND, details.pendingBalance)}
        </p>
      </BalanceCardShell>
    </div>
  );
}

function StudentBalanceCard({
  details,
  currencyLabel,
  isInactive,
  t,
}: {
  details: WalletDetailsApiResponse;
  currencyLabel: string;
  isInactive: boolean;
  t: ReturnType<typeof useTranslations<'Wallet.balanceCard'>>;
}) {
  return (
    <BalanceCardShell accent={isInactive ? 'violet' : 'emerald'}>
      <CurrencyLabel label={currencyLabel} />
      {isInactive ? (
        <>
          <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Wallet className="size-5 text-violet-100" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {t('studentWalletInactiveTitle')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-violet-100/90">
                  {t('studentWalletInactiveHint')}
                </p>
              </div>
            </div>
          </div>
          {(details.totalSpent ?? 0) > 0 ? (
            <p className="mt-3 text-sm text-violet-100/90">
              {t('studentSpentLabel')}:{' '}
              <span className="font-semibold text-white">
                {formatToCurrency(ECurrency.VND, details.totalSpent ?? 0)}
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium text-emerald-200/95">{t('studentLabel')}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-300 md:text-4xl">
            {formatToCurrency(
              ECurrency.VND,
              details.walletBalance ?? details.availableBalance,
            )}
          </p>
          <div className="mt-3 space-y-1 text-sm text-violet-100/90">
            {(details.totalSpent ?? 0) > 0 ? (
              <p>
                {t('studentSpentLabel')}:{' '}
                <span className="font-semibold text-white">
                  {formatToCurrency(ECurrency.VND, details.totalSpent ?? 0)}
                </span>
              </p>
            ) : null}
            {details.totalEarned > 0 ? (
              <p>
                {t('studentRefundedLabel')}:{' '}
                <span className="font-semibold text-white">
                  {formatToCurrency(ECurrency.VND, details.totalEarned)}
                </span>
              </p>
            ) : null}
            {details.pendingBalance > 0 ? (
              <p>
                {t('studentPendingLabel')}:{' '}
                <span className="font-semibold text-white">
                  {formatToCurrency(ECurrency.VND, details.pendingBalance)}
                </span>
              </p>
            ) : null}
          </div>
        </>
      )}
    </BalanceCardShell>
  );
}

export default function WalletBalanceCard({ details, isPending }: WalletBalanceCardProps) {
  const t = useTranslations('Wallet.balanceCard');
  const user = useAtomValue(userAtom);
  const isTutor = details?.role === 'TUTOR' || user?.role === 'TUTOR';
  const isStudentWalletInactive =
    details?.role === 'STUDENT' && details.hasWallet === false;

  if (isPending || !details) {
    return (
      <div className="relative">
        <div
          className={
            isTutor
              ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
              : 'mx-auto w-full max-w-md md:max-w-[calc(50%-0.5rem)]'
          }
        >
          {isTutor ? (
            <>
              <Skeleton className="h-24 rounded-2xl bg-violet-200/80" />
              <Skeleton className="h-24 rounded-2xl bg-violet-200/80" />
            </>
          ) : (
            <Skeleton className="h-24 rounded-2xl bg-violet-200/80" />
          )}
        </div>
        <SecuredBadge label={t('secured')} />
      </div>
    );
  }

  return (
    <div className="relative">
      {isTutor ? (
        <TutorBalanceCards
          details={details}
          currencyLabel={t('currency')}
          availableLabel={t('tutorAvailableLabel')}
          pendingLabel={t('tutorPendingLabel')}
        />
      ) : (
        <div className="flex justify-center">
          <div className="w-full max-w-md md:max-w-[calc(50%-0.5rem)]">
            <StudentBalanceCard
              details={details}
              currencyLabel={t('currency')}
              isInactive={isStudentWalletInactive}
              t={t}
            />
          </div>
        </div>
      )}
      <SecuredBadge label={t('secured')} />
    </div>
  );
}



