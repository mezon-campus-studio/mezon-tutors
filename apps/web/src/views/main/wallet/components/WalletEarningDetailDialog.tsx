'use client';

import { CalendarClock, Clock4, GraduationCap, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ECurrency,
  formatToCurrency,
  type WalletTransactionApiItem,
} from '@mezon-tutors/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@/components/ui';
import { useUserTimezone } from '@/hooks';
import { formatInstantForLocale } from '@/lib/timezone';
import { cn } from '@/lib/utils';

type WalletEarningDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: WalletTransactionApiItem | null;
  viewerRole?: 'student' | 'tutor';
};

const initials = (name?: string) => {
  if (!name?.trim()) return 'S';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'S'
  );
};

export default function WalletEarningDetailDialog({
  open,
  onOpenChange,
  transaction,
  viewerRole = 'tutor',
}: WalletEarningDetailDialogProps) {
  const t = useTranslations('Wallet.transactions.detailDialog');
  const locale = useLocale();
  const userTimezone = useUserTimezone();

  const detail = transaction?.lessonDetail ?? null;
  const isPlan = detail?.lessonKind === 'subscription';
  const isStudentViewer = viewerRole === 'student';
  const counterpartyName = isStudentViewer
    ? (detail?.tutorName ?? 'Tutor')
    : (detail?.studentName ?? 'Student');
  const counterpartyAvatarUrl = isStudentViewer
    ? detail?.tutorAvatarUrl
    : detail?.studentAvatarUrl;
  const isCredit = transaction?.direction === 'CREDIT';
  const amountPrefix = isCredit ? '+' : '−';
  const amountLabel = isStudentViewer
    ? isCredit
      ? 'Amount refunded'
      : 'Amount paid'
    : t('amountEarned');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[calc(100vh-0.75rem)] gap-0 overflow-hidden rounded-3xl border-violet-100 p-0 shadow-2xl shadow-violet-200/40 sm:max-w-[420px]"
      >
        <div
          className={cn(
            'relative overflow-hidden px-5 pb-4 pt-5',
            isPlan
              ? 'bg-[linear-gradient(135deg,#a21caf_0%,#7c3aed_100%)]'
              : 'bg-[linear-gradient(135deg,#d97706_0%,#ea580c_100%)]'
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex items-start gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm">
              <Wallet className="size-5 text-white" />
            </div>
            <DialogHeader className="space-y-0.5 p-0 pr-7 text-left">
              <DialogTitle className="text-lg font-bold leading-tight tracking-tight text-white">
                {t('title')}
              </DialogTitle>
              <DialogDescription className="text-sm leading-snug text-white/85">
                {t('description')}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="max-h-[calc(100vh-10.25rem)] space-y-4 overflow-y-auto px-5 py-4">
          {detail ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <Avatar className="size-11 shrink-0 rounded-xl border border-white shadow-sm">
                  {counterpartyAvatarUrl ? (
                    <AvatarImage
                      src={counterpartyAvatarUrl}
                      alt={counterpartyName}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback
                    className={cn(
                      'rounded-xl text-xs font-bold text-white',
                      isPlan
                        ? 'bg-linear-to-br from-fuchsia-600 to-violet-600'
                        : 'bg-linear-to-br from-amber-500 to-orange-600'
                    )}
                  >
                    {initials(counterpartyName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-500">
                    {isStudentViewer ? 'Tutor' : t('student')}
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {counterpartyName}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    isPlan
                      ? 'border-fuchsia-200/60 bg-fuchsia-100/90 text-fuchsia-800'
                      : 'border-amber-200/60 bg-amber-100/90 text-amber-900'
                  )}
                >
                  {isPlan ? t('lessonTagPlan') : t('lessonTagTrial')}
                </Badge>
              </div>

              <div className="grid gap-2.5">
                <DetailRow
                  icon={<GraduationCap className="size-4 text-violet-600" />}
                  label={t('lessonType')}
                  value={isPlan ? t('lessonTypePlan') : t('lessonTypeTrial')}
                />
                <DetailRow
                  icon={<CalendarClock className="size-4 text-violet-600" />}
                  label={t('lessonTime')}
                  value={formatInstantForLocale(detail.startAt, userTimezone, locale)}
                />
                <DetailRow
                  icon={<Clock4 className="size-4 text-violet-600" />}
                  label={t('duration')}
                  value={t('durationValue', { minutes: detail.durationMinutes })}
                />
              </div>

              {transaction ? (
                <div
                  className={cn(
                    'rounded-2xl border px-4 py-3',
                    isCredit
                      ? 'border-emerald-100 bg-emerald-50/70'
                      : 'border-rose-100 bg-rose-50/70'
                  )}
                >
                  <p
                    className={cn(
                      'text-xs font-semibold uppercase tracking-[0.14em]',
                      isCredit ? 'text-emerald-700' : 'text-rose-700'
                    )}
                  >
                    {amountLabel}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-2xl font-bold tabular-nums',
                      isCredit ? 'text-emerald-700' : 'text-rose-700'
                    )}
                  >
                    {amountPrefix}
                    {formatToCurrency(ECurrency.VND, transaction.amount)}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      isCredit ? 'text-emerald-700/80' : 'text-rose-700/80'
                    )}
                  >
                    {t('receivedAt')}:{' '}
                    {formatInstantForLocale(transaction.createdAt, userTimezone, locale)}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          <DialogFooter className="gap-2 border-t border-slate-100 pt-3 sm:justify-end">
            <Button
              type="button"
              className="h-10 rounded-full border-0 bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-6 font-semibold text-white shadow-md shadow-violet-300/40 hover:opacity-90"
              onClick={() => onOpenChange(false)}
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-violet-100/90 bg-slate-50/80 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
