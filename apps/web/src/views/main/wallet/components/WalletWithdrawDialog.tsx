'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useCreateWalletWithdrawal } from '@/services';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components/ui';

type WalletWithdrawDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAmount: number;
};

export default function WalletWithdrawDialog({
  open,
  onOpenChange,
  maxAmount,
}: WalletWithdrawDialogProps) {
  const t = useTranslations('Wallet.withdrawDialog');
  const { mutateAsync, isPending } = useCreateWalletWithdrawal();
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  const reset = () => {
    setAmount('');
    setBankName('');
    setBankAccountNumber('');
    setBankAccountName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount.replace(/\D/g, ''));
    if (!parsed || parsed < 10_000) return;

    try {
      await mutateAsync({
        amount: parsed,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
      });
      toast.success(t('successTitle'), { description: t('successDescription') });
      reset();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errorFallback');
      toast.error(t('errorTitle'), { description: message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-violet-100">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">{t('amount')}</Label>
            <Input
              id="withdraw-amount"
              inputMode="numeric"
              placeholder={String(maxAmount)}
              className="rounded-xl border-violet-100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="withdraw-bank">{t('bankName')}</Label>
            <Input
              id="withdraw-bank"
              className="rounded-xl border-violet-100"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="withdraw-account">{t('accountNumber')}</Label>
            <Input
              id="withdraw-account"
              className="rounded-xl border-violet-100"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="withdraw-holder">{t('accountName')}</Label>
            <Input
              id="withdraw-holder"
              className="rounded-xl border-violet-100"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-[linear-gradient(110deg,#7c3aed,#db2777)] text-white"
              disabled={isPending}
            >
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
