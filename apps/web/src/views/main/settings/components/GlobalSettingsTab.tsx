'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserTimezone } from '@/hooks';
import { buildTimezoneOptions, formatTimezoneOptionLabel } from '@/lib/timezone-options';
import { detectBrowserTimezone } from '@/lib/timezone';
import { authService } from '@/services/auth/auth.service';
import { userAtom } from '@/store/auth.atom';

type GlobalSettingsTabProps = {
  locale: string;
};

export default function GlobalSettingsTab({ locale }: GlobalSettingsTabProps) {
  const t = useTranslations('Settings.globalSettings');
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const resolvedTimezone = useUserTimezone();
  const savedTimezone = user?.timezone?.trim() || resolvedTimezone;

  const options = useMemo(
    () => buildTimezoneOptions(locale, [savedTimezone, detectBrowserTimezone()]),
    [locale, savedTimezone],
  );

  const [selectedTimezone, setSelectedTimezone] = useState(savedTimezone);
  const [isSaving, setIsSaving] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [shouldRenderOptions, setShouldRenderOptions] = useState(false);

  const selectedTimezoneLabel = useMemo(
    () => formatTimezoneOptionLabel(selectedTimezone),
    [selectedTimezone],
  );

  useEffect(() => {
    setSelectedTimezone(savedTimezone);
  }, [savedTimezone]);

  const hasChanges = selectedTimezone !== savedTimezone;

  const handleUseBrowserTimezone = () => {
    setSelectedTimezone(detectBrowserTimezone());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await authService.updateTimezone(selectedTimezone);
      setUser((current) =>
        current
          ? {
              ...current,
              timezone: result.timezone,
            }
          : current,
      );
      toast.success(t('toast.saveSuccessTitle'), {
        description: t('toast.saveSuccessDescription'),
      });
    } catch {
      toast.error(t('toast.saveFailedTitle'), {
        description: t('toast.saveFailedDescription'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
      <div className="overflow-hidden rounded-t-2xl border-b border-violet-50 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-5 py-5 md:px-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-violet-100">
            <Globe className="size-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{t('title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
        <div className="space-y-2">
          <label htmlFor="timezone-select" className="text-sm font-semibold text-slate-800">
            {t('timezone.label')}
          </label>
          <p className="text-sm text-slate-500">{t('timezone.description')}</p>
          <Select
            value={selectedTimezone}
            onOpenChange={(open) => {
              setIsSelectOpen(open);
              if (open) setShouldRenderOptions(true);
            }}
            open={isSelectOpen}
            onValueChange={(value) => {
              if (value) setSelectedTimezone(value);
            }}
          >
            <SelectTrigger
              id="timezone-select"
              className="h-11 w-full rounded-full border-violet-100 bg-white text-left"
            >
              <SelectValue placeholder={t('timezone.placeholder')}>
                {selectedTimezoneLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              side="bottom"
              align="start"
              alignItemWithTrigger={false}
              className="max-h-72 min-w-[min(100vw-2rem,28rem)]"
            >
              {shouldRenderOptions
                ? options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                : null}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full border-violet-200 text-violet-700 hover:bg-violet-50"
            onClick={handleUseBrowserTimezone}
            disabled={isSaving}
          >
            {t('timezone.useBrowser')}
          </Button>

          <Button
            type="button"
            variant="gradient"
            className="h-11 rounded-full"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? t('timezone.saving') : t('timezone.save')}
          </Button>
        </div>
      </div>
    </section>
  );
}
