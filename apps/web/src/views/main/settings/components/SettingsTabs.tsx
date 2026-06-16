'use client';

import { CalendarSync, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import DashboardViewTabs from '@/components/dashboard/DashboardViewTabs';

export type SettingsTab = 'globalSettings' | 'googleCalendar';

const TABS: SettingsTab[] = ['globalSettings', 'googleCalendar'];

const TAB_ICONS = {
  globalSettings: Globe,
  googleCalendar: CalendarSync,
} as const;

type SettingsTabsProps = {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
};

export default function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  const t = useTranslations('Settings');

  return (
    <DashboardViewTabs
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={onTabChange}
      getLabel={(tab) => t(`tabs.${tab}`)}
      tabIcons={TAB_ICONS}
    />
  );
}
