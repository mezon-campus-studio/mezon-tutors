'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { WalletTransactionApiItem } from '@mezon-tutors/shared';
import { cn } from '@/lib/utils';
import TutorsPagination from '@/views/main/tutors/components/TutorsPagination';
import WalletTransactionsList from '../components/WalletTransactionsList';

type FilterKey = 'all' | 'credit' | 'debit';

type StudentWalletTransactionsSectionProps = {
  items: WalletTransactionApiItem[];
  page: number;
  totalPages: number;
  isLoading?: boolean;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
};

export default function StudentWalletTransactionsSection({
  items,
  page,
  totalPages,
  isLoading,
  isFetching,
  onPageChange,
}: StudentWalletTransactionsSectionProps) {
  const t = useTranslations('Wallet.student.transactions');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'credit') return items.filter((i) => i.direction === 'CREDIT');
    return items.filter((i) => i.direction === 'DEBIT');
  }, [filter, items]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'credit', label: t('filterCredit') },
    { key: 'debit', label: t('filterDebit') },
  ];

  return (
    <section
      aria-labelledby="wallet-transactions-heading"
      className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"
    >
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="wallet-transactions-heading" className="text-lg font-bold tracking-tight text-slate-900">
            {t('title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                filter === key
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-5">
        <WalletTransactionsList
          items={filteredItems}
          isLoading={isLoading}
          variant="ledger"
          detailViewerRole="student"
        />
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <TutorsPagination
          page={page}
          totalPages={totalPages}
          isFetching={isFetching}
          onPageChangeAction={onPageChange}
        />
      </div>
    </section>
  );
}
