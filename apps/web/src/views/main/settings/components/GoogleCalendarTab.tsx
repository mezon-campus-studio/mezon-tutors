'use client';

import { useState } from 'react';
import { CalendarSync, CheckCircle2, Link2, RefreshCw, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { redirectToGoogleCalendarOAuth } from '@/lib/google-calendar-oauth-redirect';
import {
  useDisconnectGoogleCalendar,
  useGoogleCalendarStatus,
  useSyncGoogleCalendar,
} from '@/services';

function GoogleCalendarMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10z" />
      <path fill="#34A853" d="M5 10h14v2H5z" />
      <path fill="#FBBC05" d="M7 13h3v3H7z" />
      <path fill="#EA4335" d="M11 13h3v3h-3z" />
      <path fill="#4285F4" d="M15 13h2v3h-2z" />
    </svg>
  );
}

function formatSyncedDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

type GoogleCalendarTabProps = {
  locale: string;
};

export default function GoogleCalendarTab({ locale }: GoogleCalendarTabProps) {
  const t = useTranslations('Settings.googleCalendar');
  const { data: status, isPending } = useGoogleCalendarStatus();
  const disconnectMutation = useDisconnectGoogleCalendar();
  const syncMutation = useSyncGoogleCalendar();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isConnected = status?.connected ?? false;
  const needsReconnect = status?.needsReconnect ?? false;
  const connectedEmail = status?.googleEmail ?? null;
  const lastSyncedLabel = formatSyncedDate(status?.lastSyncedAt, locale);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await redirectToGoogleCalendarOAuth();
    } catch {
      setIsConnecting(false);
      toast.error(t('toast.connectFailedTitle'), {
        description: t('toast.connectFailedDescription'),
      });
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast.success(t('toast.syncSuccessTitle'), {
        description: t('syncSummary', {
          synced: result.synced,
          created: result.created,
          updated: result.updated,
          removed: result.removed,
        }),
      });
    } catch {
      toast.error(t('toast.syncFailedTitle'), {
        description: t('toast.syncFailedDescription'),
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      setShowDisconnectConfirm(false);
      toast.success(t('toast.disconnectSuccessTitle'), {
        description: t('toast.disconnectSuccessDescription'),
      });
    } catch {
      toast.error(t('toast.disconnectFailedTitle'), {
        description: t('toast.disconnectFailedDescription'),
      });
    }
  };

  const benefitKeys = ['autoSync', 'reminders', 'availability'] as const;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
        <div className="border-b border-violet-50 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-violet-100">
                <GoogleCalendarMark />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">{t('title')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
              </div>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : needsReconnect
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                    : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <CalendarSync className="size-3.5" />
              )}
              {isPending
                ? t('loading')
                : isConnected
                  ? t('status.connected')
                  : needsReconnect
                    ? t('status.needsReconnect')
                    : t('status.notConnected')}
            </span>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
          {isConnected && connectedEmail ? (
            <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
              <p>{t('connectedAs', { email: connectedEmail })}</p>
              {lastSyncedLabel ? (
                <p className="text-emerald-700/80">{t('lastSynced', { date: lastSyncedLabel })}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <h3 className="text-sm font-semibold text-slate-900">{t('benefits.title')}</h3>
            <ul className="mt-3 space-y-2.5">
              {benefitKeys.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500" />
                  {t(`benefits.items.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isConnected ? (
              <>
                <Button
                  type="button"
                  variant="gradient"
                  className="h-11 rounded-full"
                  onClick={handleSync}
                  disabled={syncMutation.isPending || disconnectMutation.isPending}
                >
                  <RefreshCw
                    className={`mr-2 size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  {syncMutation.isPending ? t('syncing') : t('sync')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => setShowDisconnectConfirm(true)}
                  disabled={disconnectMutation.isPending || syncMutation.isPending}
                >
                  <Unlink className="mr-2 size-4" />
                  {disconnectMutation.isPending ? t('disconnecting') : t('disconnect')}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="gradient"
                className="h-11 rounded-full"
                onClick={handleConnect}
                disabled={isConnecting || isPending}
              >
                <Link2 className="mr-2 size-4" />
                {isConnecting ? t('connecting') : needsReconnect ? t('reconnect') : t('connect')}
              </Button>
            )}
          </div>
        </div>
      </section>

      {showDisconnectConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">{t('disconnectConfirm.title')}</h3>
            <p className="mt-2 text-sm text-slate-500">{t('disconnectConfirm.description')}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setShowDisconnectConfirm(false)}
                disabled={disconnectMutation.isPending}
              >
                {t('disconnectConfirm.cancel')}
              </Button>
              <Button
                type="button"
                className="h-10 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending
                  ? t('disconnecting')
                  : t('disconnectConfirm.confirm')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
