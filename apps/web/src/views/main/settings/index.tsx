'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SettingsTabs, { type SettingsTab } from './components/SettingsTabs';
import GlobalSettingsTab from './components/GlobalSettingsTab';
import GoogleCalendarTab from './components/GoogleCalendarTab';
import SettingsOAuthHandler from './components/SettingsOAuthHandler';
import { warmupTimezoneOptions } from '@/lib/timezone-options';

const DEFAULT_TAB: SettingsTab = 'globalSettings';

const TAB_PARAM_MAP: Record<string, SettingsTab> = {
  'global-settings': 'globalSettings',
  'google-calendar': 'googleCalendar',
};

const TAB_TO_PARAM: Record<SettingsTab, string> = {
  globalSettings: 'global-settings',
  googleCalendar: 'google-calendar',
};

export default function SettingsView() {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlTab = useMemo(() => {
    const param = searchParams.get('tab');
    if (param && param in TAB_PARAM_MAP) {
      return TAB_PARAM_MAP[param];
    }
    return DEFAULT_TAB;
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<SettingsTab>(urlTab);
  const [mountedTabs, setMountedTabs] = useState<Set<SettingsTab>>(
    () => new Set([urlTab]),
  );

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    setMountedTabs((current) => {
      if (current.has(activeTab)) return current;
      const next = new Set(current);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    const warmup = () => warmupTimezoneOptions();
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warmup);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warmup, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleTabChange = useCallback(
    (tab: SettingsTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', TAB_TO_PARAM[tab]);
      params.delete('gcal');
      params.delete('reason');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-hidden px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      <SettingsOAuthHandler />

      <header className="mb-6 flex items-center gap-3 md:mb-8">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-300/35">
          <Settings className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
      </header>

      <div className="mb-6 md:mb-8">
        <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {mountedTabs.has('globalSettings') ? (
        <div hidden={activeTab !== 'globalSettings'}>
          <GlobalSettingsTab locale={locale} />
        </div>
      ) : null}
      {mountedTabs.has('googleCalendar') ? (
        <div hidden={activeTab !== 'googleCalendar'}>
          <GoogleCalendarTab locale={locale} />
        </div>
      ) : null}
    </div>
  );
}
