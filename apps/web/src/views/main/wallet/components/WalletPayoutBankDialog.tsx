'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, CreditCard, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { WalletPayoutBankAccount } from '@mezon-tutors/shared';
import { useUpdateWalletPayoutBank } from '@/services';
import { cn } from '@/lib/utils';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
} from '@/components/ui';
import { createPayoutBankSchema, type PayoutBankFormValues } from '@/lib/schemas';
import { WalletFieldError } from './WalletFieldError';

type WalletPayoutBankDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBank?: WalletPayoutBankAccount | null;
};

export default function WalletPayoutBankDialog({
  open,
  onOpenChange,
  initialBank,
}: WalletPayoutBankDialogProps) {
  const t = useTranslations('Wallet.payoutBankDialog');
  const tValidation = useTranslations('Wallet.payoutBankDialog.validation');
  const { mutateAsync, isPending } = useUpdateWalletPayoutBank();

  const schema = useMemo(
    () =>
      createPayoutBankSchema({
        bankNameRequired: tValidation('bankNameRequired'),
        bankNameMin: tValidation('bankNameMin'),
        bankNameMax: tValidation('bankNameMax'),
        accountNumberRequired: tValidation('accountNumberRequired'),
        accountNumberDigits: tValidation('accountNumberDigits'),
        accountNumberMin: tValidation('accountNumberMin'),
        accountNumberMax: tValidation('accountNumberMax'),
        accountNameRequired: tValidation('accountNameRequired'),
        accountNameMin: tValidation('accountNameMin'),
        accountNameMax: tValidation('accountNameMax'),
        accountNameInvalid: tValidation('accountNameInvalid'),
      }),
    [tValidation]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PayoutBankFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    reset({
      bankName: initialBank?.bankName ?? '',
      bankAccountNumber: initialBank?.bankAccountNumber ?? '',
      bankAccountName: initialBank?.bankAccountName ?? '',
    });
  }, [open, initialBank, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync({
        bankName: values.bankName.trim(),
        bankAccountNumber: values.bankAccountNumber.trim(),
        bankAccountName: values.bankAccountName.trim(),
      });
      toast.success(t('successTitle'), { description: t('successDescription') });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errorFallback');
      toast.error(t('errorTitle'), { description: message });
    }
  });

  const accountNumberRegister = register('bankAccountNumber');
  const accountNumberValue = watch('bankAccountNumber');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden rounded-3xl border-violet-100/80 p-0 shadow-2xl shadow-violet-200/30 sm:max-w-[440px]"
      >
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_55%,#a855f7_100%)] px-6 pb-5 pt-6 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm">
              <Building2 className="size-5" />
            </div>
            <DialogHeader className="space-y-1.5 p-0 text-left">
              <DialogTitle className="text-lg font-bold tracking-tight text-white">
                {t('title')}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-indigo-100/95">
                {t('description')}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 px-6 py-5"
          noValidate
        >
          <div className="space-y-2">
            <Label
              htmlFor="payout-bank"
              className="text-xs font-semibold text-slate-700"
            >
              {t('bankName')}
            </Label>
            <InputGroup
              className={cn(
                'h-11 rounded-xl border-violet-100/90 bg-slate-50/80',
                errors.bankName && 'border-rose-300 bg-rose-50/40'
              )}
            >
              <InputGroupAddon>
                <Building2 className="size-4 text-violet-600" />
              </InputGroupAddon>
              <InputGroupInput
                id="payout-bank"
                placeholder={t('bankNamePlaceholder')}
                aria-invalid={Boolean(errors.bankName)}
                className="bg-transparent text-sm"
                {...register('bankName')}
              />
            </InputGroup>
            <WalletFieldError message={errors.bankName?.message} />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="payout-account"
              className="text-xs font-semibold text-slate-700"
            >
              {t('accountNumber')}
            </Label>
            <InputGroup
              className={cn(
                'h-11 rounded-xl border-violet-100/90 bg-slate-50/80',
                errors.bankAccountNumber && 'border-rose-300 bg-rose-50/40'
              )}
            >
              <InputGroupAddon>
                <CreditCard className="size-4 text-violet-600" />
              </InputGroupAddon>
              <InputGroupInput
                id="payout-account"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('accountNumberPlaceholder')}
                aria-invalid={Boolean(errors.bankAccountNumber)}
                className="bg-transparent font-mono text-sm tracking-wide"
                name={accountNumberRegister.name}
                ref={accountNumberRegister.ref}
                value={accountNumberValue}
                onBlur={accountNumberRegister.onBlur}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setValue('bankAccountNumber', digits, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              />
            </InputGroup>
            <WalletFieldError message={errors.bankAccountNumber?.message} />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="payout-holder"
              className="text-xs font-semibold text-slate-700"
            >
              {t('accountName')}
            </Label>
            <InputGroup
              className={cn(
                'h-11 rounded-xl border-violet-100/90 bg-slate-50/80',
                errors.bankAccountName && 'border-rose-300 bg-rose-50/40'
              )}
            >
              <InputGroupAddon>
                <UserRound className="size-4 text-violet-600" />
              </InputGroupAddon>
              <InputGroupInput
                id="payout-holder"
                autoComplete="name"
                placeholder={t('accountNamePlaceholder')}
                aria-invalid={Boolean(errors.bankAccountName)}
                className="bg-transparent text-sm uppercase"
                {...register('bankAccountName')}
              />
            </InputGroup>
            <WalletFieldError message={errors.bankAccountName?.message} />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-violet-100/80 bg-violet-50/50 px-3 py-2.5">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-violet-600"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-slate-600">{t('securityNote')}</p>
          </div>

          <DialogFooter className="gap-2 pt-1 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-slate-200 px-5"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-full border-0 bg-[linear-gradient(110deg,#6d28d9,#7c3aed,#db2777)] px-6 font-semibold text-white shadow-md shadow-violet-300/40 hover:opacity-95"
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
