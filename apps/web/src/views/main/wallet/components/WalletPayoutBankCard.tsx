'use client';

import { Building2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WalletPayoutBankAccount } from '@mezon-tutors/shared';
import { Button } from '@/components/ui';

function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `•••• ${accountNumber.slice(-4)}`;
}

type WalletPayoutBankCardProps = {
  bank: WalletPayoutBankAccount | null;
  onManageBankClick: () => void;
};

export default function WalletPayoutBankCard({ bank, onManageBankClick }: WalletPayoutBankCardProps) {
  const t = useTranslations('Wallet.payoutBank');

  return (
    <div className="rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <Building2 className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900">{t('cardTitle')}</p>
            {bank ? (
              <div className="mt-2 space-y-1">
                <p className="truncate text-sm font-bold text-slate-900">{bank.bankName}</p>
                <p className="text-xs tabular-nums text-slate-600">
                  {maskAccountNumber(bank.bankAccountNumber)}
                </p>
                <p className="truncate text-xs text-slate-500">{bank.bankAccountName.toUpperCase()}</p>
              </div>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('cardEmptyHint')}</p>
            )}
          </div>
        </div>
        {bank ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-lg text-slate-500 hover:text-violet-700"
            onClick={onManageBankClick}
            aria-label={t('cardEdit')}
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {!bank ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-9 w-full rounded-full border-violet-200 text-xs font-semibold text-violet-800 hover:bg-violet-50"
          onClick={onManageBankClick}
        >
          {t('cardAddCta')}
        </Button>
      ) : null}
    </div>
  );
}
