'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownToLine,
  Building2,
  Copy,
  CreditCard,
  Download,
  Pencil,
  Receipt,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ACCEPT_FILE_TYPES,
  CLOUDINARY_FOLDER,
  ECurrency,
  MAX_FILE_SIZE_MB,
  formatCurrencyAmountInputDisplay,
  formatToCurrency,
  getCurrencySymbol,
  toCanonicalCurrencyAmountInput,
  type WalletPayoutBankAccount,
  WITHDRAWAL_WINDOW_CLOSED_CODE,
} from '@mezon-tutors/shared';
import { ApiError, cloudinaryService, useCreateWalletWithdrawal } from '@/services';
import { cn } from '@/lib/utils';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Textarea,
} from '@/components/ui';
import { WalletFieldError } from './WalletFieldError';
import { WITHDRAW_MIN_AMOUNT, createWithdrawSchema } from '@/lib/schemas';

const WITHDRAW_CURRENCY = ECurrency.VND;

type WalletWithdrawDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAmount: number;
  initialBank?: WalletPayoutBankAccount | null;
} & (
  | {
      mode?: 'request';
    }
  | {
      mode: 'review';
      reviewAction?: 'approve' | 'reject' | 'detail';
      reviewDetails: Partial<WalletPayoutBankAccount> & {
        amount: number;
        tutorName?: string;
        requesterName?: string;
        paymentProofUrl?: string | null;
        adminNote?: string | null;
        processedAt?: string | null;
      };
      reviewLabels: {
        title: string;
        description: string;
        tutor: string;
        requester?: string;
        transferAmount: string;
        bankSectionTitle: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
        confirm: string;
        cancel: string;
        submitting: string;
        noteLabel?: string;
        notePlaceholder?: string;
        noteRequiredError?: string;
        proofTitle?: string;
        proofHint?: string;
        proofUploadPrompt?: string;
        proofUploading?: string;
        proofDropHere?: string;
        proofRequiredError?: string;
        proofUploadError?: string;
        proofTooLargeError?: string;
        proofInvalidTypeError?: string;
        proofRemove?: string;
        close?: string;
        viewProof?: string;
        noProof?: string;
        processedAtLabel?: string;
        copyProof?: string;
        downloadProof?: string;
        copyProofSuccess?: string;
        copyProofError?: string;
      };
      isConfirming?: boolean;
      onConfirm?: (params: {
        adminNote?: string;
        paymentProofUrl?: string;
        paymentProofPublicId?: string;
      }) => void | Promise<void>;
    }
);

export default function WalletWithdrawDialog(props: WalletWithdrawDialogProps) {
  const { open, onOpenChange, maxAmount, initialBank } = props;
  const t = useTranslations('Wallet.withdrawDialog');
  const tBankValidation = useTranslations('Wallet.payoutBankDialog.validation');
  const { mutateAsync, isPending } = useCreateWalletWithdrawal();

  const canWithdraw = maxAmount >= WITHDRAW_MIN_AMOUNT;
  const proofInputId = 'wallet-review-proof-upload';
  const hasSavedBank = Boolean(
    initialBank?.bankName?.trim() &&
      initialBank?.bankAccountNumber?.trim() &&
      initialBank?.bankAccountName?.trim()
  );
  const [isBankEditing, setIsBankEditing] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [proof, setProof] = useState<{
    url: string;
    publicId: string;
    fileName: string;
  } | null>(null);
  const proofUploadSeqRef = useRef(0);

  const schema = useMemo(
    () =>
      createWithdrawSchema(
        {
          bankNameRequired: tBankValidation('bankNameRequired'),
          bankNameMin: tBankValidation('bankNameMin'),
          bankNameMax: tBankValidation('bankNameMax'),
          accountNumberRequired: tBankValidation('accountNumberRequired'),
          accountNumberDigits: tBankValidation('accountNumberDigits'),
          accountNumberMin: tBankValidation('accountNumberMin'),
          accountNumberMax: tBankValidation('accountNumberMax'),
          accountNameRequired: tBankValidation('accountNameRequired'),
          accountNameMin: tBankValidation('accountNameMin'),
          accountNameMax: tBankValidation('accountNameMax'),
          accountNameInvalid: tBankValidation('accountNameInvalid'),
        },
        {
          amountRequired: t('validation.amountRequired'),
          amountDigits: t('validation.amountDigits'),
          amountMin: t('validation.amountMin'),
          amountMax: t('validation.amountMax', {
            max: formatToCurrency(ECurrency.VND, maxAmount),
          }),
        },
        maxAmount
      ),
    [t, tBankValidation, maxAmount]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    const saved = Boolean(
      initialBank?.bankName?.trim() &&
        initialBank?.bankAccountNumber?.trim() &&
        initialBank?.bankAccountName?.trim()
    );
    reset({
      amount: '',
      bankName: initialBank?.bankName ?? '',
      bankAccountNumber: initialBank?.bankAccountNumber ?? '',
      bankAccountName: initialBank?.bankAccountName ?? '',
    });
    setIsBankEditing(!saved);
  }, [open, initialBank, reset]);

  useEffect(() => {
    if (open && props.mode === 'review') {
      setAdminNote('');
      setNoteError(null);
      setProof(null);
      setProofError(null);
      setProofUploading(false);
      proofUploadSeqRef.current += 1;
    }
  }, [open, props.mode]);

  const bankFieldsDisabled = hasSavedBank && !isBankEditing;
  const bankInputGroupClass = (invalid: boolean) =>
    cn(
      'h-10 rounded-xl border-violet-100/90 bg-slate-50/80',
      invalid && 'border-rose-300 bg-rose-50/40',
      bankFieldsDisabled && 'cursor-default border-slate-200/90 bg-slate-100/80 opacity-90'
    );

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync({
        amount: values.amount,
        bankName: values.bankName.trim(),
        bankAccountNumber: values.bankAccountNumber.trim(),
        bankAccountName: values.bankAccountName.trim(),
      });
      toast.success(t('successTitle'), { description: t('successDescription') });
      onOpenChange(false);
    } catch (err) {
      const isWindowClosed =
        err instanceof ApiError && err.message === WITHDRAWAL_WINDOW_CLOSED_CODE;
      const message = isWindowClosed
        ? t('windowClosedDescription')
        : err instanceof Error
          ? err.message
          : t('errorFallback');
      toast.error(isWindowClosed ? t('windowClosedTitle') : t('errorTitle'), {
        description: message,
      });
    }
  });

  const accountNumberRegister = register('bankAccountNumber');
  const amountRegister = register('amount');
  const accountNumberValue = watch('bankAccountNumber');
  const amountValue = watch('amount');

  const setMaxAmount = () => {
    setValue('amount', String(maxAmount), { shouldValidate: true, shouldDirty: true });
  };

  if (props.mode === 'review') {
    const {
      reviewAction = 'approve',
      reviewDetails,
      reviewLabels,
      isConfirming,
      onConfirm,
    } = props;
    const isRejectReview = reviewAction === 'reject';
    const isApproveReview = reviewAction === 'approve';
    const isDetailReview = reviewAction === 'detail';

    const handleProofFile = (file: File) => {
      const allowedExt = new Set(['pdf', 'jpg', 'jpeg', 'png']);
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExt.has(ext)) {
        setProofError(reviewLabels.proofInvalidTypeError ?? 'Invalid file type');
        return;
      }
      const bytesLimit = MAX_FILE_SIZE_MB * 1024 * 1024;
      if (file.size > bytesLimit) {
        setProofError(reviewLabels.proofTooLargeError ?? 'File too large');
        return;
      }

      setProofError(null);
      proofUploadSeqRef.current += 1;
      const seq = proofUploadSeqRef.current;
      const previousPublicId = proof?.publicId;
      setProofUploading(true);

      void cloudinaryService
        .uploadFileWithSignature(file, CLOUDINARY_FOLDER.ADMIN_PAYMENTS, 'auto')
        .then((uploaded) => {
          if (proofUploadSeqRef.current !== seq) return;
          setProof({
            url: uploaded.secureUrl,
            publicId: uploaded.publicId,
            fileName: file.name,
          });
          if (previousPublicId && previousPublicId !== uploaded.publicId) {
            void cloudinaryService.deleteFile(previousPublicId).catch(() => null);
          }
        })
        .catch(() => {
          if (proofUploadSeqRef.current !== seq) return;
          setProofError(reviewLabels.proofUploadError ?? 'Upload failed');
        })
        .finally(() => {
          if (proofUploadSeqRef.current === seq) setProofUploading(false);
        });
    };

    const handleRemoveProof = () => {
      if (proof?.publicId) {
        void cloudinaryService.deleteFile(proof.publicId).catch(() => null);
      }
      setProof(null);
      setProofError(null);
      proofUploadSeqRef.current += 1;
    };

    const handleCopyProof = async (proofUrl: string) => {
      try {
        const response = await fetch(proofUrl);
        const blob = await response.blob();
        if (
          typeof ClipboardItem !== 'undefined' &&
          navigator.clipboard?.write &&
          blob.type.startsWith('image/')
        ) {
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } else {
          await navigator.clipboard.writeText(proofUrl);
        }
        toast.success(reviewLabels.copyProofSuccess ?? 'Copied');
      } catch {
        try {
          await navigator.clipboard.writeText(proofUrl);
          toast.success(reviewLabels.copyProofSuccess ?? 'Copied');
        } catch {
          toast.error(reviewLabels.copyProofError ?? 'Copy failed');
        }
      }
    };

    const handleDownloadProof = async (proofUrl: string) => {
      try {
        const response = await fetch(proofUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = proofUrl.split('/').pop()?.split('?')[0] || 'payment-proof';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        window.open(proofUrl, '_blank', 'noopener,noreferrer');
      }
    };

    const handleConfirm = () => {
      if (!onConfirm) return;
      if (isApproveReview) {
        if (!proof) {
          setProofError(reviewLabels.proofRequiredError ?? 'Payment proof is required');
          return;
        }
        void onConfirm({
          adminNote: adminNote.trim() || undefined,
          paymentProofUrl: proof.url,
          paymentProofPublicId: proof.publicId,
        });
        return;
      }
      if (isRejectReview && !adminNote.trim()) {
        setNoteError(reviewLabels.noteRequiredError ?? 'Please enter a reason for the rejection.');
        return;
      }
      void onConfirm({ adminNote: adminNote.trim() || undefined });
    };

    const confirmDisabled =
      Boolean(isConfirming) ||
      proofUploading ||
      (isApproveReview && !proof);

    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <DialogContent
          showCloseButton
          className="max-h-[calc(100vh-0.75rem)] gap-0 overflow-hidden rounded-3xl border-violet-100 p-0 shadow-2xl shadow-violet-200/40 sm:max-w-[460px]"
        >
          <div className="relative overflow-hidden bg-brand-gradient px-5 pb-4 pt-5">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex items-start gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm">
                <ArrowDownToLine className="size-5 text-white" />
              </div>
              <DialogHeader className="space-y-0.5 p-0 pr-7 text-left">
                <DialogTitle className="text-lg font-bold leading-tight tracking-tight text-white">
                  {reviewLabels.title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-snug text-white/85">
                  {reviewLabels.description}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="relative mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-orange-50/90">
                <UserRound className="size-3.5 shrink-0" />
                <span>{reviewLabels.requester ?? reviewLabels.tutor}</span>
              </div>
              <span className="text-sm font-bold text-white">
                {reviewDetails.requesterName ?? reviewDetails.tutorName ?? '—'}
              </span>
            </div>
          </div>

          <div className="max-h-[calc(100vh-10.25rem)] space-y-4 overflow-y-auto px-5 py-4">
            <div className="rounded-2xl border border-violet-100/80 bg-violet-50/70 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                {reviewLabels.transferAmount}
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {formatToCurrency(ECurrency.VND, reviewDetails.amount)}
              </p>
            </div>

            {isRejectReview ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <Label
                  htmlFor="withdraw-reject-note"
                  className="text-xs font-semibold text-slate-700"
                >
                  {reviewLabels.noteLabel}
                  <span className="ml-0.5 text-rose-500">*</span>
                </Label>
                <Textarea
                  id="withdraw-reject-note"
                  value={adminNote}
                  onChange={(event) => {
                    setAdminNote(event.target.value);
                    if (noteError && event.target.value.trim()) setNoteError(null);
                  }}
                  placeholder={reviewLabels.notePlaceholder}
                  aria-invalid={Boolean(noteError)}
                  className={cn(
                    'min-h-[96px] resize-none rounded-xl border-violet-100 bg-white p-3 text-sm text-slate-700 focus-visible:ring-2 focus-visible:ring-violet-200',
                    noteError && 'border-rose-300 bg-rose-50/40 focus-visible:ring-rose-200'
                  )}
                />
                {noteError ? (
                  <p className="text-xs font-medium text-rose-600">{noteError}</p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="space-y-2.5 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {reviewLabels.bankSectionTitle}
                  </p>

                  <div className="grid gap-2.5">
                    <ReadonlyInfoRow
                      icon={<Building2 className="size-4 text-violet-600" />}
                      label={reviewLabels.bankName}
                      value={reviewDetails.bankName ?? '—'}
                    />
                    <ReadonlyInfoRow
                      icon={<CreditCard className="size-4 text-violet-600" />}
                      label={reviewLabels.accountNumber}
                      value={reviewDetails.bankAccountNumber ?? '—'}
                      valueClassName="font-mono tracking-wide"
                    />
                    <ReadonlyInfoRow
                      icon={<UserRound className="size-4 text-violet-600" />}
                      label={reviewLabels.accountName}
                      value={reviewDetails.bankAccountName ?? '—'}
                      valueClassName="uppercase"
                    />
                  </div>
                </div>

                {isApproveReview ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-4 text-violet-600" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {reviewLabels.proofTitle ?? 'Payment proof'}
                      </p>
                    </div>
                    {proof ? (
                      <div className="flex items-center gap-3 rounded-xl border border-violet-100/90 bg-violet-50/60 px-3 py-2">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600">
                          <Receipt className="size-4" />
                        </div>
                        <a
                          href={proof.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate text-sm font-medium text-violet-900 hover:underline"
                        >
                          {proof.fileName}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0 text-slate-500 hover:text-rose-600"
                          onClick={handleRemoveProof}
                          disabled={Boolean(isConfirming)}
                          aria-label={reviewLabels.proofRemove ?? 'Remove'}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          id={proofInputId}
                          type="file"
                          accept={ACCEPT_FILE_TYPES}
                          className="sr-only"
                          disabled={proofUploading || Boolean(isConfirming)}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleProofFile(file);
                            event.target.value = '';
                          }}
                        />
                        <label
                          htmlFor={proofInputId}
                          className={cn(
                            'flex min-h-[142px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/35 px-4 py-4 text-center transition-colors hover:border-violet-300 hover:bg-violet-50/60',
                            proofUploading && 'pointer-events-none opacity-70',
                            proofError && 'border-rose-300 bg-rose-50/50'
                          )}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const file = event.dataTransfer.files?.[0];
                            if (file) handleProofFile(file);
                          }}
                        >
                          <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                            <ArrowDownToLine className="size-5 rotate-180" />
                          </span>
                          <span className="mt-3 text-sm font-bold text-slate-900">
                            {proofUploading
                              ? reviewLabels.proofUploading ?? 'Uploading...'
                              : reviewLabels.proofUploadPrompt ?? 'Click or drag the receipt here'}
                          </span>
                          {reviewLabels.proofHint ? (
                            <span className="mt-1 max-w-[310px] text-xs leading-snug text-slate-500">
                              {reviewLabels.proofHint}
                            </span>
                          ) : null}
                        </label>
                        {proofError ? (
                          <p className="text-xs font-medium text-rose-600">{proofError}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {isDetailReview ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-4 text-violet-600" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {reviewLabels.proofTitle ?? 'Payment proof'}
                      </p>
                    </div>
                    {reviewDetails.paymentProofUrl ? (
                      (() => {
                        const proofUrl = reviewDetails.paymentProofUrl;
                        const isPdf = proofUrl.split('?')[0].toLowerCase().endsWith('.pdf');
                        if (isPdf) {
                          return (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 rounded-xl border border-violet-100/90 bg-violet-50/60 px-3 py-2 transition-colors hover:bg-violet-50"
                            >
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600">
                                <Receipt className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-violet-900 hover:underline">
                                {reviewLabels.viewProof ?? 'View payment proof'}
                              </span>
                            </a>
                          );
                        }
                        return (
                          <div className="group relative overflow-hidden rounded-xl border border-violet-100/90 bg-slate-50">
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={proofUrl}
                                alt={reviewLabels.proofTitle ?? 'Payment proof'}
                                className="max-h-[320px] w-full object-contain"
                              />
                            </a>
                            <div className="absolute right-2 top-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyProof(proofUrl)}
                                aria-label={reviewLabels.copyProof ?? 'Copy'}
                                title={reviewLabels.copyProof ?? 'Copy'}
                                className="flex size-8 items-center justify-center rounded-lg border border-white/60 bg-white/85 text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-violet-700"
                              >
                                <Copy className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadProof(proofUrl)}
                                aria-label={reviewLabels.downloadProof ?? 'Download'}
                                title={reviewLabels.downloadProof ?? 'Download'}
                                className="flex size-8 items-center justify-center rounded-lg border border-white/60 bg-white/85 text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-violet-700"
                              >
                                <Download className="size-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-xs text-slate-500">
                        {reviewLabels.noProof ?? 'No payment proof available.'}
                      </div>
                    )}
                  </div>
                ) : null}

                {isDetailReview && reviewDetails.adminNote ? (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {reviewLabels.noteLabel ?? 'Note'}
                    </p>
                    <p className="rounded-xl border border-violet-100/90 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
                      {reviewDetails.adminNote}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            <DialogFooter className="gap-2 border-t border-slate-100 pt-3 sm:justify-end">
              {isDetailReview ? (
                <Button
                  type="button"
                  className="h-10 rounded-full border-0 bg-brand-gradient px-6 font-semibold text-white shadow-md shadow-violet-300/40 hover:opacity-90"
                  onClick={() => onOpenChange(false)}
                >
                  {reviewLabels.close ?? reviewLabels.cancel}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full border-slate-200 px-5"
                    onClick={() => onOpenChange(false)}
                    disabled={isConfirming}
                  >
                    {reviewLabels.cancel}
                  </Button>
                  <Button
                    type="button"
                    className={cn(
                      'h-10 rounded-full border-0 px-6 font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60',
                      isRejectReview
                        ? 'bg-rose-600 shadow-rose-300/40 hover:bg-rose-700'
                        : 'bg-brand-gradient shadow-violet-300/40'
                    )}
                    disabled={confirmDisabled}
                    onClick={handleConfirm}
                  >
                    {isConfirming ? reviewLabels.submitting : reviewLabels.confirm}
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton
        className="max-h-[calc(100vh-0.75rem)] gap-0 overflow-hidden rounded-3xl border-violet-100 p-0 shadow-2xl shadow-violet-200/40 sm:max-w-[520px]"
      >
        <div className="relative overflow-hidden bg-brand-gradient px-5 pb-4 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex items-start gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm">
              <ArrowDownToLine className="size-5 text-white" />
            </div>
            <DialogHeader className="min-w-0 flex-1 space-y-1 p-0 text-left">
              <div className="flex items-start justify-between gap-3 pr-8">
                <DialogTitle className="min-w-0 text-lg font-bold tracking-tight text-white">
                  {t('title')}
                </DialogTitle>
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur-sm">
                  <Wallet className="size-3.5 shrink-0" />
                  <span className="text-xs text-white/85">{t('availableLabel')}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {formatToCurrency(ECurrency.VND, maxAmount)}
                  </span>
                </div>
              </div>
              <DialogDescription className="text-sm leading-relaxed text-white/85">
                {t('description')}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {!canWithdraw ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm font-medium text-slate-700">{t('insufficientTitle')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('insufficientHint')}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto px-5 py-4"
            noValidate
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="withdraw-amount"
                  className="text-xs font-semibold text-violet-700"
                >
                  {t('amount')}
                </Label>
                <button
                  type="button"
                  className="cursor-pointer rounded-lg bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-200"
                  onClick={setMaxAmount}
                >
                  {t('withdrawMax')}
                </button>
              </div>
              <div
                className={cn(
                  'flex h-11 items-center rounded-xl border border-violet-100/90 bg-violet-50/50 px-4 transition-colors focus-within:border-violet-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-200/70',
                  errors.amount && 'border-rose-300 bg-rose-50/40'
                )}
              >
                <span className="mr-2 shrink-0 text-base font-bold text-violet-600">
                  {getCurrencySymbol(WITHDRAW_CURRENCY)}
                </span>
                <Input
                  id="withdraw-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={formatCurrencyAmountInputDisplay(WITHDRAW_CURRENCY, '0')}
                  aria-invalid={Boolean(errors.amount)}
                  className="h-auto flex-1 border-0 bg-transparent p-0 text-lg font-bold text-violet-700 tabular-nums tracking-tight placeholder:text-violet-400/80 focus-visible:ring-0"
                  name={amountRegister.name}
                  ref={amountRegister.ref}
                  value={formatCurrencyAmountInputDisplay(WITHDRAW_CURRENCY, amountValue)}
                  onBlur={amountRegister.onBlur}
                  onChange={(e) => {
                    const next = toCanonicalCurrencyAmountInput(e.target.value, WITHDRAW_CURRENCY);
                    setValue('amount', next, { shouldValidate: true, shouldDirty: true });
                  }}
                />
              </div>
              <WalletFieldError message={errors.amount?.message} />
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {t('bankSectionTitle')}
                </p>
                {hasSavedBank ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 hover:text-violet-900"
                    onClick={() => setIsBankEditing((prev) => !prev)}
                  >
                    <Pencil className="size-3.5" />
                    {isBankEditing ? t('bankDoneEdit') : t('bankEdit')}
                  </Button>
                ) : null}
              </div>

              {!hasSavedBank ? (
                <p className="text-xs text-slate-500">{t('bankRequiredHint')}</p>
              ) : null}

              <div className="space-y-1.5">
                <Label
                  htmlFor="withdraw-bank"
                  className="text-xs font-semibold text-slate-700"
                >
                  {t('bankName')}
                </Label>
                <InputGroup className={bankInputGroupClass(Boolean(errors.bankName))}>
                  <InputGroupAddon>
                    <Building2 className="size-4 text-violet-600" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="withdraw-bank"
                    disabled={bankFieldsDisabled}
                    placeholder={t('bankNamePlaceholder')}
                    aria-invalid={Boolean(errors.bankName)}
                    className="bg-transparent text-sm disabled:cursor-default disabled:opacity-100"
                    {...register('bankName')}
                  />
                </InputGroup>
                <WalletFieldError message={errors.bankName?.message} />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="withdraw-account"
                  className="text-xs font-semibold text-slate-700"
                >
                  {t('accountNumber')}
                </Label>
                <InputGroup className={bankInputGroupClass(Boolean(errors.bankAccountNumber))}>
                  <InputGroupAddon>
                    <CreditCard className="size-4 text-violet-600" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="withdraw-account"
                    disabled={bankFieldsDisabled}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={t('accountNumberPlaceholder')}
                    aria-invalid={Boolean(errors.bankAccountNumber)}
                    className="bg-transparent font-mono text-sm tracking-wide disabled:cursor-default disabled:opacity-100"
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

              <div className="space-y-1.5">
                <Label
                  htmlFor="withdraw-holder"
                  className="text-xs font-semibold text-slate-700"
                >
                  {t('accountName')}
                </Label>
                <InputGroup className={bankInputGroupClass(Boolean(errors.bankAccountName))}>
                  <InputGroupAddon>
                    <UserRound className="size-4 text-violet-600" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="withdraw-holder"
                    disabled={bankFieldsDisabled}
                    autoComplete="name"
                    placeholder={t('accountNamePlaceholder')}
                    aria-invalid={Boolean(errors.bankAccountName)}
                    className="bg-transparent text-sm uppercase disabled:cursor-default disabled:opacity-100"
                    {...register('bankAccountName')}
                  />
                </InputGroup>
                <WalletFieldError message={errors.bankAccountName?.message} />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-violet-100/80 bg-violet-50/70 px-3 py-2">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-violet-600"
                aria-hidden
              />
              <p className="text-xs leading-relaxed text-violet-900/85">{t('securityNote')}</p>
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
                className="h-10 rounded-full border-0 bg-brand-gradient px-6 font-semibold text-white shadow-md shadow-violet-300/40 hover:opacity-90"
                disabled={isPending}
              >
                {isPending ? t('submitting') : t('submit')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ReadonlyInfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
};

function ReadonlyInfoRow({
  icon,
  label,
  value,
  valueClassName,
}: ReadonlyInfoRowProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-violet-100/90 bg-slate-50/80 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className={`truncate text-sm font-semibold text-slate-900 ${valueClassName ?? ''}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
