'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useWalletDetails,
  useWalletStats,
  useWalletTransactions,
} from '@/services';
import StudentWalletBentoStats from './StudentWalletBentoStats';
import StudentWalletHero from './StudentWalletHero';
import StudentWalletInsightPanel from './StudentWalletInsightPanel';
import StudentWalletTransactionsSection from './StudentWalletTransactionsSection';

export default function StudentWalletView() {
  const t = useTranslations('Wallet');
  const [txPage, setTxPage] = useState(1);

  const { data: details, isPending: detailsPending } = useWalletDetails();
  const { data: stats, isPending: statsPending } = useWalletStats();
  const { data: txData, isPending: txPending, isFetching: txFetching } =
    useWalletTransactions(txPage);

  const headerPending = detailsPending || statsPending;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-300/35">
          <Wallet className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitleStudent')}</p>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_300px] items-center">
        <StudentWalletHero details={details} stats={stats} isPending={detailsPending} />
        <StudentWalletInsightPanel details={details} stats={stats} isPending={headerPending} />
      </div>

      <div className="mb-8">
        <StudentWalletBentoStats details={details} stats={stats} isPending={headerPending} />
      </div>

      <StudentWalletTransactionsSection
        items={txData?.items ?? []}
        page={txPage}
        totalPages={txData?.meta?.totalPages ?? 1}
        isLoading={txPending}
        isFetching={txFetching}
        onPageChange={setTxPage}
      />
    </div>
  );
}
