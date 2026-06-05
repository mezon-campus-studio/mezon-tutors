'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useWalletDetails,
  useWalletStats,
  useWalletTransactions,
  useWalletWithdrawals,
} from '@/services';
import WalletPayoutBankDialog from '../components/WalletPayoutBankDialog';
import WalletWithdrawDialog from '../components/WalletWithdrawDialog';
import TutorWalletActivitySection from './TutorWalletActivitySection';
import TutorWalletBentoStats from './TutorWalletBentoStats';
import TutorWalletHero from './TutorWalletHero';
import TutorWalletInsightPanel from './TutorWalletInsightPanel';

export default function TutorWalletView() {
  const t = useTranslations('Wallet');
  const [txPage, setTxPage] = useState(1);
  const [wdPage, setWdPage] = useState(1);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);

  const { data: details, isPending: detailsPending } = useWalletDetails();
  const { data: stats, isPending: statsPending } = useWalletStats();
  const { data: txData, isPending: txPending, isFetching: txFetching } =
    useWalletTransactions(txPage);
  const { data: wdData, isPending: wdPending, isFetching: wdFetching } = useWalletWithdrawals(
    wdPage,
    true,
  );

  const headerPending = detailsPending || statsPending;
  const wdItems = wdData?.items ?? [];

  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.18),transparent)] md:h-[440px] lg:h-[520px]"
      />

      <header className="relative mb-6 flex items-center gap-3 md:mb-8">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-white shadow-lg shadow-indigo-300/40">
          <Wallet className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitleTutor')}</p>
        </div>
      </header>

      <div className="relative mb-6 grid grid-cols-1 items-stretch gap-4 md:mb-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <TutorWalletHero
          details={details}
          stats={stats}
          isPending={detailsPending}
          onWithdrawClick={() => setWithdrawOpen(true)}
        />
        <TutorWalletInsightPanel
          details={details}
          stats={stats}
          isPending={headerPending}
          onManageBankClick={() => setBankDialogOpen(true)}
        />
      </div>

      <div className="relative mb-6 md:mb-8">
        <TutorWalletBentoStats details={details} stats={stats} isPending={headerPending} />
      </div>

      <div className="relative">
        <TutorWalletActivitySection
          transactions={txData?.items ?? []}
          withdrawals={wdItems}
          txPage={txPage}
          txTotalPages={txData?.meta?.totalPages ?? 1}
          wdPage={wdPage}
          wdTotalPages={wdData?.meta?.totalPages ?? 1}
          isTxLoading={txPending}
          isWdLoading={wdPending}
          isTxFetching={txFetching}
          isWdFetching={wdFetching}
          onTxPageChange={setTxPage}
          onWdPageChange={setWdPage}
        />
      </div>

      {details ? (
        <>
          <WalletWithdrawDialog
            open={withdrawOpen}
            onOpenChange={setWithdrawOpen}
            maxAmount={details.availableBalance}
            initialBank={details.payoutBankAccount}
          />
          <WalletPayoutBankDialog
            open={bankDialogOpen}
            onOpenChange={setBankDialogOpen}
            initialBank={details.payoutBankAccount}
          />
        </>
      ) : null}
    </div>
  );
}
