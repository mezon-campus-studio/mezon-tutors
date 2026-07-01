'use client';

import { ArrowRight, Copy, Headphones } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OnboardingRole, OnboardingStepConfig } from '@mezon-tutors/shared';
import {
  ONBOARDING_AVATAR_OPACITY_CLASS,
  ONBOARDING_CHECKLIST_AUTO_INTERVAL_MS,
  ONBOARDING_CHECKLIST_RING_RADIUS,
  ONBOARDING_CHECKLIST_RING_STROKE,
  getOnboardingImageSrcForCheck,
} from '@mezon-tutors/shared';
import { ONBOARDING_ICON_BY_KEY } from './onboarding-icons';
import { toast } from '@/components/ui';

function getOnboardingRoleBadgeLabel(
  role: OnboardingRole,
  t: ReturnType<typeof useTranslations<'Onboarding'>>,
) {
  return role === 'utilities' ? t('sections.utilities') : t(`roles.${role}`);
}

function renderOnboardingLink(href: string | undefined, chunks: ReactNode) {
  if (!href?.trim()) {
    return <span className="font-semibold text-violet-700">{chunks}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-pointer font-semibold text-violet-700 underline underline-offset-2"
    >
      {chunks}
    </a>
  );
}

function buildOnboardingTipRichComponents(
  actionHref: string | undefined,
  tipLinks: Record<string, string>,
) {
  return {
    plus: (chunks: ReactNode) => (
      <span className="text-xl font-black text-violet-700">{chunks}</span>
    ),
    command: (chunks: ReactNode) => (
      <span className="rounded-md bg-violet-100 px-1.5 py-0.5 font-bold text-violet-800">
        {chunks}
      </span>
    ),
    link: (chunks: ReactNode) => renderOnboardingLink(actionHref, chunks),
    ...Object.fromEntries(
      Object.entries(tipLinks).map(([key, href]) => [
        key,
        (chunks: ReactNode) => renderOnboardingLink(href, chunks),
      ]),
    ),
  };
}

function buildRoundedRectPathFromTopLeft(w: number, h: number, radius: number) {
  if (w <= 0 || h <= 0) return '';

  const inset = ONBOARDING_CHECKLIST_RING_STROKE / 2;
  const width = w - inset * 2;
  const height = h - inset * 2;
  const r = Math.min(radius - inset, width / 2, height / 2);
  const left = inset;
  const top = inset;
  const right = inset + width;
  const bottom = inset + height;

  return [
    `M ${left} ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    `L ${right - r} ${top}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `L ${right} ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `L ${left + r} ${bottom}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `L ${left} ${top + r}`,
  ].join(' ');
}

function ChecklistRingBorder({ progress }: { progress: number }) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      setDimensions({ w: width, h: height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pathD = useMemo(
    () => buildRoundedRectPathFromTopLeft(dimensions.w, dimensions.h, ONBOARDING_CHECKLIST_RING_RADIUS),
    [dimensions.w, dimensions.h]
  );

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [pathD]);

  const dashOffset = pathLength * (1 - progress);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden
    >
      {dimensions.w > 0 && dimensions.h > 0 ? (
        <svg
          width={dimensions.w}
          height={dimensions.h}
          className="overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor="#7c3aed"
              />
              <stop
                offset="50%"
                stopColor="#a855f7"
              />
              <stop
                offset="100%"
                stopColor="#d071ff"
              />
            </linearGradient>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke="#ede9fe"
            strokeWidth={ONBOARDING_CHECKLIST_RING_STROKE}
          />
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={ONBOARDING_CHECKLIST_RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={pathLength || undefined}
            strokeDashoffset={dashOffset}
          />
        </svg>
      ) : null}
    </div>
  );
}

function useStepChecklist(stepId: string, role: string, tipCount: number) {
  const [activeCheckIndex, setActiveCheckIndex] = useState(0);
  const [checkCycleKey, setCheckCycleKey] = useState(0);
  const [ringProgress, setRingProgress] = useState(0);

  useEffect(() => {
    setActiveCheckIndex(0);
    setCheckCycleKey(0);
  }, [stepId, role]);

  useEffect(() => {
    if (tipCount <= 1) return;

    const timer = window.setInterval(() => {
      setActiveCheckIndex((prev) => (prev + 1) % tipCount);
    }, ONBOARDING_CHECKLIST_AUTO_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [stepId, role, tipCount, checkCycleKey]);

  useEffect(() => {
    setRingProgress(0);
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const ratio = Math.min((now - start) / ONBOARDING_CHECKLIST_AUTO_INTERVAL_MS, 1);
      setRingProgress(ratio);
      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [stepId, role, activeCheckIndex, checkCycleKey]);

  const handleSelectCheck = (index: number) => {
    setActiveCheckIndex(index);
    setCheckCycleKey((key) => key + 1);
  };

  return { activeCheckIndex, ringProgress, handleSelectCheck };
}

function StepImagePreview({
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError: () => void;
}) {
  return (
    <div className="relative isolate mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[1.25rem] border border-violet-100 bg-white p-3 shadow-lg shadow-violet-200/40">
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="block max-h-[min(480px,60vh)] w-full object-contain"
          onError={onError}
        />
      </div>
    </div>
  );
}

function StepVisual({
  step,
  role,
  index,
}: {
  step: OnboardingStepConfig;
  role: OnboardingRole;
  index: number;
}) {
  const t = useTranslations('Onboarding');
  const Icon = ONBOARDING_ICON_BY_KEY[step.iconKey];

  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-none">
      <div
        className={`pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br ${step.accent} opacity-20 blur-2xl`}
      />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-lg shadow-violet-200/40">
        <div className="mb-4 flex items-center justify-between">
          <div
            className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-white shadow-md shadow-violet-300/40`}
          >
            <Icon className="size-5" />
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-600">
            {getOnboardingRoleBadgeLabel(role, t)} · {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="space-y-2.5">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center gap-2.5 rounded-xl bg-violet-50/80 px-3 py-2.5"
            >
              <span className={`size-2 shrink-0 rounded-full bg-gradient-to-br ${step.accent}`} />
              <div className="flex-1 space-y-1">
                <div
                  className="h-2 rounded-full bg-violet-200/80"
                  style={{ width: `${72 - row * 12}%` }}
                />
                <div
                  className="h-1.5 rounded-full bg-violet-100"
                  style={{ width: `${55 - row * 8}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-violet-50 pt-3">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className={`size-6 rounded-full border-2 border-white bg-gradient-to-br ${step.accent} ${ONBOARDING_AVATAR_OPACITY_CLASS[dot]}`}
              />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-slate-400">Mezonly</span>
        </div>
      </div>
    </div>
  );
}

function StepIllustration({
  step,
  role,
  index,
  activeCheckIndex = 0,
}: {
  step: OnboardingStepConfig;
  role: OnboardingRole;
  index: number;
  activeCheckIndex?: number;
}) {
  const t = useTranslations('Onboarding');
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = getOnboardingImageSrcForCheck(activeCheckIndex, step.imageSrcs);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc, step.id, activeCheckIndex]);

  if (!imageSrc || imageFailed) {
    return <StepVisual step={step} role={role} index={index} />;
  }

  const imageAlt = t(`${role}.steps.${step.id}.imageAlt`);
  const imageCount = step.imageSrcs?.filter(Boolean).length ?? 0;

  return (
    <StepImagePreview
      src={imageSrc}
      alt={
        imageCount > 1
          ? `${imageAlt} (${activeCheckIndex + 1}/${imageCount})`
          : imageAlt
      }
      onError={() => setImageFailed(true)}
    />
  );
}

type StepDetailPanelProps = {
  step: OnboardingStepConfig;
  role: OnboardingRole;
  stepIndex: number;
  actionHref?: string;
  actionLabel: string;
  tipLinks?: Record<string, string>;
  isOpening: boolean;
  onContactSupport: () => void;
};

export function StepDetailPanel({
  step,
  role,
  stepIndex,
  actionHref,
  actionLabel,
  tipLinks = {},
  isOpening,
  onContactSupport,
}: StepDetailPanelProps) {
  const t = useTranslations('Onboarding');
  const { activeCheckIndex, ringProgress, handleSelectCheck } = useStepChecklist(
    step.id,
    role,
    step.tipKeys.length
  );
  const tipRichComponents = buildOnboardingTipRichComponents(actionHref, tipLinks);
  const setupCommand = '*mezonly setup*';

  const copyCommandToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(setupCommand);
      toast.success(t('copiedSetupCommand'));
    } catch {
      toast.error(t('copySetupCommandError'));
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_minmax(240px,320px)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
            {t('stepBadge', { step: stepIndex + 1 })}
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {t(`${role}.steps.${step.id}.title`)}
          </h2>
          <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            {t(`${role}.steps.${step.id}.description`)}
          </p>
        </div>

        <div className="lg:hidden">
          <StepIllustration
            step={step}
            role={role}
            index={stepIndex}
            activeCheckIndex={activeCheckIndex}
          />
        </div>

        <ul className="space-y-2.5">
          {step.tipKeys.map((tipKey, checkIndex) => {
            const isActive = activeCheckIndex === checkIndex;

            return (
              <li key={tipKey}>
                <div className={`relative rounded-2xl ${isActive ? 'p-[2px]' : ''}`}>
                  {isActive ? <ChecklistRingBorder progress={ringProgress} /> : null}
                  <button
                    type="button"
                    onClick={() => handleSelectCheck(checkIndex)}
                    className={`relative z-10 flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors duration-300 ${
                      isActive
                        ? 'rounded-[14px] bg-white shadow-md shadow-violet-200/30'
                        : 'rounded-2xl border border-violet-100 bg-violet-50/50 hover:border-violet-200 hover:bg-white/80'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold transition-all ${
                        isActive
                          ? `bg-gradient-to-br ${step.accent} text-white shadow-sm`
                          : 'bg-white text-slate-400 ring-1 ring-slate-200'
                      }`}
                    >
                      {checkIndex + 1}
                    </span>
                    <span
                      className={`text-sm leading-6 transition-colors ${
                        isActive ? 'font-semibold text-violet-900' : 'text-slate-700'
                      }`}
                    >
                      {t.rich(
                        `${role}.steps.${step.id}.tips.${tipKey}`,
                        tipRichComponents,
                      )}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {actionHref ? (
            actionHref.startsWith('http') ? (
              <a
                href={actionHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
              >
                {actionLabel}
                <ArrowRight className="size-3.5" />
              </a>
            ) : (
              <Link
                href={actionHref}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
              >
                {actionLabel}
                <ArrowRight className="size-3.5" />
              </Link>
            )
          ) : null}
          {step.id === 'setupCommand' ? (
            <button
              type="button"
              onClick={copyCommandToClipboard}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
            >
              <Copy className="size-3.5" />
              {t('copySetupCommand')}
            </button>
          ) : null}
          <button
            type="button"
            disabled={isOpening}
            onClick={onContactSupport}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Headphones className="size-3.5" />
            {t('contactSupport')}
          </button>
        </div>
      </div>

      <div className="hidden lg:block">
        <StepIllustration
          step={step}
          role={role}
          index={stepIndex}
          activeCheckIndex={activeCheckIndex}
        />
      </div>
    </div>
  );
}
