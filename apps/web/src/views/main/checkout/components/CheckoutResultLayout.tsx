'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const checkoutGradientButtonClass =
  'rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-8 text-white shadow-lg shadow-violet-300/40 hover:opacity-95';

export const checkoutOutlineButtonClass =
  'rounded-full border-violet-200 bg-white/80 px-8 text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700';

type CheckoutResultTone = 'success' | 'error' | 'warning';

const toneStyles: Record<
  CheckoutResultTone,
  { iconBox: string; badge: string; glow: string }
> = {
  success: {
    iconBox:
      'border-violet-200/80 bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 shadow-violet-200/50',
    badge:
      'border-violet-200/80 bg-violet-50/80 text-violet-700',
    glow: 'bg-[radial-gradient(circle,rgba(124,58,237,0.18),transparent_70%)]',
  },
  error: {
    iconBox:
      'border-rose-200/80 bg-[linear-gradient(135deg,#ffe4e6,#fecdd3)] text-rose-600 shadow-rose-200/50',
    badge:
      'border-rose-200/80 bg-rose-50/80 text-rose-700',
    glow: 'bg-[radial-gradient(circle,rgba(244,63,94,0.14),transparent_70%)]',
  },
  warning: {
    iconBox:
      'border-amber-200/80 bg-[linear-gradient(135deg,#fef3c7,#fde68a)] text-amber-700 shadow-amber-200/50',
    badge:
      'border-amber-200/80 bg-amber-50/80 text-amber-700',
    glow: 'bg-[radial-gradient(circle,rgba(245,158,11,0.14),transparent_70%)]',
  },
};

export function CheckoutResultShell({
  children,
  maxWidth = 'max-w-4xl',
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/25 blur-[140px]" />
        <div className="absolute top-1/3 -right-24 size-[28rem] rounded-full bg-fuchsia-200/30 blur-[120px]" />
      </div>

      <div className={cn('relative mx-auto w-full px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10', maxWidth)}>
        {children}
      </div>
    </div>
  );
}

export function CheckoutResultHero({
  icon: Icon,
  badge,
  title,
  description,
  tone = 'success',
  align = 'left',
}: {
  icon: LucideIcon;
  badge: React.ReactNode;
  title: string;
  description?: string;
  tone?: CheckoutResultTone;
  align?: 'left' | 'center';
}) {
  const styles = toneStyles[tone];

  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-5 sm:mb-10 sm:gap-6',
        align === 'center'
          ? 'items-center text-center'
          : 'items-center sm:flex-row sm:items-start sm:text-left',
      )}
    >
      <div className="relative shrink-0">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-2xl" />
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-3xl border shadow-md',
            styles.iconBox,
          )}
        >
          <Icon className="size-8 stroke-[1.75]" aria-hidden />
        </div>
      </div>

      <div className={cn('min-w-0 flex-1', align === 'center' && 'flex flex-col items-center')}>
        <span
          className={cn(
            'mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]',
            styles.badge,
          )}
        >
          {badge}
        </span>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-600 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export function CheckoutResultCard({
  children,
  className,
  variant = 'none',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'none' | 'solid' | 'muted' | 'dashed';
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[2rem] backdrop-blur',
        variant === 'solid' &&
          'border border-violet-100 bg-white/90 shadow-xl shadow-violet-200/30',
        variant === 'muted' &&
          'border border-violet-100/80 bg-violet-50/30 shadow-sm',
        variant === 'dashed' &&
          'border border-dashed border-violet-200/70 bg-white/60 shadow-none',
        variant === 'none' &&
          'border-none bg-transparent shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CheckoutResultSectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <span className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function CheckoutResultLoadingView({ message }: { message: string }) {
  return (
    <CheckoutResultShell maxWidth="max-w-3xl">
      <CheckoutResultCard className="p-8 text-center">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <div className="size-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          <p>{message}</p>
        </div>
      </CheckoutResultCard>
    </CheckoutResultShell>
  );
}

export function CheckoutResultEmptyState({
  description,
  action,
}: {
  description: string;
  action: React.ReactNode;
}) {
  return (
    <CheckoutResultShell maxWidth="max-w-lg">
      <CheckoutResultCard className="p-8 text-center">
        <p className="text-base text-slate-600">{description}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </CheckoutResultCard>
    </CheckoutResultShell>
  );
}

export function CheckoutResultActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
      {children}
    </div>
  );
}
