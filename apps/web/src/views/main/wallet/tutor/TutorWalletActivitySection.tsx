'use client';

import dayjs from 'dayjs';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Eye,
  Receipt,
  Search,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  formatToCurrency,
  ECurrency,
  type WalletTransactionApiItem,
  type WalletWithdrawalApiItem,
} from '@mezon-tutors/shared';
import { Badge, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import TutorsPagination from '@/views/main/tutors/components/TutorsPagination';
import WalletWithdrawDialog from '@/views/main/wallet/components/WalletWithdrawDialog';

type TabKey = 'transactions' | 'payouts';
type TxFilter = 'all' | 'credit' | 'debit' | 'withdrawal';

type TutorWalletActivitySectionProps = {
  transactions: WalletTransactionApiItem[];
  withdrawals: WalletWithdrawalApiItem[];
  txPage: number;
  txTotalPages: number;
  wdPage: number;
  wdTotalPages: number;
  isTxLoading?: boolean;
  isWdLoading?: boolean;
  isTxFetching?: boolean;
  isWdFetching?: boolean;
  onTxPageChange: (page: number) => void;
  onWdPageChange: (page: number) => void;
};

function groupByDay<T extends { createdAt: string }>(items: T[], locale: string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dayjs(item.createdAt).locale(locale).format('YYYY-MM-DD');
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function exportCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TutorWalletActivitySection({
  transactions,
  withdrawals,
  txPage,
  txTotalPages,
  wdPage,
  wdTotalPages,
  isTxLoading,
  isWdLoading,
  isTxFetching,
  isWdFetching,
  onTxPageChange,
  onWdPageChange,
}: TutorWalletActivitySectionProps) {
  const t = useTranslations('Wallet.tutor.activity');
  const tWallet = useTranslations('Wallet');
  const locale = useLocale();
  const [tab, setTab] = useState<TabKey>('transactions');
  const [search, setSearch] = useState('');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [detailWithdrawal, setDetailWithdrawal] =
    useState<WalletWithdrawalApiItem | null>(null);

  const typeLabels: Record<string, string> = {
    BOOKING_PAYMENT: tWallet('types.BOOKING_PAYMENT'),
    RELEASE: tWallet('types.RELEASE'),
    WITHDRAWAL: tWallet('types.WITHDRAWAL'),
    REFUND: tWallet('types.REFUND'),
    PLATFORM_FEE: tWallet('types.PLATFORM_FEE'),
  };

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((item) => {
      if (txFilter === 'credit' && item.direction !== 'CREDIT') return false;
      if (txFilter === 'debit' && item.direction !== 'DEBIT') return false;
      if (txFilter === 'withdrawal' && item.type !== 'WITHDRAWAL') return false;
      if (!q) return true;
      const label = typeLabels[item.type] ?? item.type;
      return (
        label.toLowerCase().includes(q) ||
        (item.referenceLabel ?? '').toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [transactions, search, txFilter, typeLabels]);

  const filteredWd = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withdrawals;
    return withdrawals.filter(
      (w) =>
        w.bankName.toLowerCase().includes(q) ||
        w.bankAccountName.toLowerCase().includes(q) ||
        w.status.toLowerCase().includes(q),
    );
  }, [withdrawals, search]);

  const txGroups = useMemo(() => groupByDay(filteredTx, locale), [filteredTx, locale]);
  const wdGroups = useMemo(() => groupByDay(filteredWd, locale), [filteredWd, locale]);

  const handleExport = () => {
    if (tab === 'transactions') {
      exportCsv('tutor-transactions.csv', [
        ['Date', 'Type', 'Direction', 'Amount', 'Reference'],
        ...filteredTx.map((item) => [
          item.createdAt,
          item.type,
          item.direction,
          String(item.amount),
          item.referenceLabel ?? item.description ?? '',
        ]),
      ]);
      return;
    }
    exportCsv('tutor-payouts.csv', [
      ['Date', 'Amount', 'Bank', 'Status'],
      ...filteredWd.map((w) => [w.createdAt, String(w.amount), w.bankName, w.status]),
    ]);
  };

  const isLoading = tab === 'transactions' ? isTxLoading : isWdLoading;

  return (
    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{t('title')}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none ring-violet-200 focus:border-violet-300 focus:ring-2"
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="size-4" />
            {t('export')}
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1">
        {(
          [
            { key: 'transactions' as const, label: tWallet('tabs.transactions') },
            { key: 'payouts' as const, label: tWallet('tabs.withdrawals') },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
              tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(
            [
              { key: 'all' as const, label: t('filterAll') },
              { key: 'credit' as const, label: t('filterEarnings') },
              { key: 'debit' as const, label: t('filterOutgoing') },
              { key: 'withdrawal' as const, label: t('filterWithdrawals') },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTxFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                txFilter === key
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-5 min-h-[200px]">
        {isLoading ? (
          <div className="space-y-4">
            {['a', 'b', 'c'].map((id) => (
              <div key={id} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : tab === 'transactions' ? (
          filteredTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Receipt className="size-7" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{tWallet('transactions.emptyTitle')}</p>
                <p className="mt-1 text-sm text-slate-500">{tWallet('transactions.emptyDescription')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {txGroups.map(([day, items]) => (
                <div key={day}>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    {dayjs(day).locale(locale).format('dddd, D MMMM YYYY')}
                  </p>
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {items.map((item) => {
                      const isCredit = item.direction === 'CREDIT';
                      const isWithdrawal = item.type === 'WITHDRAWAL';
                      const isPending = item.type === 'RELEASE' && isCredit;
                      const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
                      const label = typeLabels[item.type] ?? item.type;
                      const dateLabel = dayjs(item.createdAt).locale(locale).format('HH:mm');
                      const iconClass = isWithdrawal
                        ? 'bg-orange-100 text-orange-700'
                        : isPending
                          ? 'bg-amber-100 text-amber-700'
                          : isCredit
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700';
                      const amountClass = isWithdrawal
                        ? 'text-orange-600'
                        : isCredit
                          ? 'text-emerald-600'
                          : 'text-rose-600';

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50/80"
                        >
                          <div
                            className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', iconClass)}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{label}</p>
                              <Badge variant="outline" className="border-slate-200 text-slate-600">
                                {isCredit ? tWallet('transactions.credit') : tWallet('transactions.debit')}
                              </Badge>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-slate-500">
                              {item.referenceLabel ?? item.description ?? dateLabel}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">{dateLabel}</p>
                          </div>
                          <p className={cn('shrink-0 text-base font-extrabold tabular-nums', amountClass)}>
                            {isCredit ? '+' : '−'}
                            {formatToCurrency(ECurrency.VND, item.amount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredWd.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="font-semibold text-slate-900">{tWallet('withdrawals.emptyTitle')}</p>
            <p className="text-sm text-slate-500">{tWallet('withdrawals.emptyDescription')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {wdGroups.map(([day, items]) => (
              <div key={day}>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  {dayjs(day).locale(locale).format('dddd, D MMMM YYYY')}
                </p>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                  {items.map((item) => {
                    const statusStyle =
                      item.status === 'COMPLETED'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : item.status === 'REJECTED'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800';
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50/80"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            −{formatToCurrency(ECurrency.VND, item.amount)}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {item.bankName} · •••• {item.bankAccountNumber.slice(-4)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusStyle}>
                            {tWallet(`withdrawals.status.${item.status}`)}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => setDetailWithdrawal(item)}
                            aria-label={tWallet('withdrawals.viewDetail')}
                            title={tWallet('withdrawals.viewDetail')}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <TutorsPagination
          page={tab === 'transactions' ? txPage : wdPage}
          totalPages={tab === 'transactions' ? txTotalPages : wdTotalPages}
          isFetching={tab === 'transactions' ? isTxFetching : isWdFetching}
          onPageChangeAction={tab === 'transactions' ? onTxPageChange : onWdPageChange}
        />
      </div>

      {detailWithdrawal ? (
        <WalletWithdrawDialog
          mode="review"
          reviewAction="detail"
          open={Boolean(detailWithdrawal)}
          onOpenChange={(openState) => {
            if (!openState) setDetailWithdrawal(null);
          }}
          maxAmount={detailWithdrawal.amount}
          reviewDetails={{
            amount: detailWithdrawal.amount,
            bankName: detailWithdrawal.bankName,
            bankAccountNumber: detailWithdrawal.bankAccountNumber,
            bankAccountName: detailWithdrawal.bankAccountName,
            tutorName: detailWithdrawal.bankAccountName,
            paymentProofUrl: detailWithdrawal.paymentProofUrl,
            adminNote: detailWithdrawal.adminNote,
            processedAt: detailWithdrawal.processedAt,
          }}
          reviewLabels={{
            title: tWallet('withdrawals.detailDialog.title'),
            description: tWallet('withdrawals.detailDialog.description'),
            tutor: tWallet('withdrawals.detailDialog.tutor'),
            transferAmount: tWallet('withdrawals.detailDialog.transferAmount'),
            bankSectionTitle: tWallet('withdrawals.detailDialog.bankSectionTitle'),
            bankName: tWallet('withdrawals.detailDialog.bankName'),
            accountNumber: tWallet('withdrawals.detailDialog.accountNumber'),
            accountName: tWallet('withdrawals.detailDialog.accountName'),
            confirm: tWallet('withdrawals.detailDialog.close'),
            cancel: tWallet('withdrawals.detailDialog.close'),
            submitting: tWallet('withdrawals.detailDialog.close'),
            close: tWallet('withdrawals.detailDialog.close'),
            noteLabel: tWallet('withdrawals.detailDialog.noteLabel'),
            proofTitle: tWallet('withdrawals.detailDialog.proofTitle'),
            viewProof: tWallet('withdrawals.detailDialog.viewProof'),
            noProof: tWallet('withdrawals.detailDialog.noProof'),
            copyProof: tWallet('withdrawals.detailDialog.copyProof'),
            downloadProof: tWallet('withdrawals.detailDialog.downloadProof'),
            copyProofSuccess: tWallet('withdrawals.detailDialog.copyProofSuccess'),
            copyProofError: tWallet('withdrawals.detailDialog.copyProofError'),
          }}
        />
      ) : null}
    </section>
  );
}
