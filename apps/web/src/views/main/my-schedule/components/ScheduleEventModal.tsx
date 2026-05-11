'use client';

import { ExternalLink, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui';

type ScheduleEventModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRect: DOMRect | null;
  variant: 'student' | 'tutor';
  peerName: string;
  dateLabel: string;
  timeLabel: string;
  onSendMessage: () => void;
  viewProfileHref?: string;
};

const PANEL_W = 320;
const PANEL_H = 260;
const GAP = 10;
const PAD = 12;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export default function ScheduleEventModal({
  open,
  onOpenChange,
  anchorRect,
  variant,
  peerName,
  dateLabel,
  timeLabel,
  onSendMessage,
  viewProfileHref,
}: ScheduleEventModalProps) {
  const t = useTranslations('Dashboard.scheduleEventModal');
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;

    if (!anchorRect) {
      setStyle({
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(calc(100vw - 2rem), 20rem)',
        zIndex: 50,
      });
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelW = Math.min(PANEL_W, vw - PAD * 2);
    const alignedTop = clamp(anchorRect.top, PAD, vh - PANEL_H - PAD);

    const fitsRight = anchorRect.right + GAP + panelW <= vw - PAD;
    const leftPlacementLeft = anchorRect.left - GAP - panelW;
    const fitsLeft = leftPlacementLeft >= PAD;

    let left: number;
    let top: number;

    if (fitsRight) {
      left = anchorRect.right + GAP;
      top = alignedTop;
    } else if (fitsLeft) {
      left = leftPlacementLeft;
      top = alignedTop;
    } else {
      left = clamp(
        anchorRect.left + anchorRect.width / 2 - panelW / 2,
        PAD,
        vw - panelW - PAD,
      );
      top = anchorRect.bottom + GAP;
      if (top + PANEL_H > vh - PAD) {
        top = anchorRect.top - PANEL_H - GAP;
      }
      top = clamp(top, PAD, vh - PANEL_H - PAD);
    }

    setStyle({
      position: 'fixed',
      left,
      top,
      width: `${panelW}px`,
      zIndex: 50,
      transform: undefined,
    });
  }, [open, anchorRect]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const end = () => onOpenChange(false);
    window.addEventListener('resize', end);
    window.addEventListener('scroll', end, true);
    return () => {
      window.removeEventListener('resize', end);
      window.removeEventListener('scroll', end, true);
    };
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label={t('dismiss')}
        className="fixed inset-0 z-45 cursor-default border-0 bg-black/3 p-0"
        onClick={() => onOpenChange(false)}
      />
      <article
        style={style}
        className="flex flex-col gap-0 overflow-hidden rounded-[1.75rem] border border-violet-100 bg-white shadow-2xl shadow-violet-300/30"
      >
        <div className="border-b border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-5 py-4 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">{t('title')}</p>
          <p className="text-lg font-extrabold text-slate-900">{peerName}</p>
          <p className="mt-1 text-sm text-slate-500">{t('subtitle', { date: dateLabel, time: timeLabel })}</p>
        </div>
        <div className="flex flex-col gap-2 px-5 py-4">
          <Button
            type="button"
            className="h-11 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-semibold text-white shadow-md shadow-violet-300/40"
            onClick={() => onSendMessage()}
          >
            <MessageCircle className="mr-2 size-4" />
            {t('sendMessage')}
          </Button>
          {variant === 'student' && viewProfileHref ? (
            <Link
              href={viewProfileHref}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-5 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
            >
              <ExternalLink className="size-4" />
              {t('viewProfile')}
            </Link>
          ) : null}
        </div>
      </article>
    </>,
    document.body,
  );
}
