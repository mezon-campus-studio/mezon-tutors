import {
  formatUtcOffsetLabel,
  getTimezoneUtcOffsetMinutes,
  isValidIanaTimezone,
} from '@/lib/timezone';

export type TimezoneOption = {
  value: string;
  label: string;
  offsetMinutes: number;
};

const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

let cachedTimezoneOptions: TimezoneOption[] | null = null;

function listSupportedTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return [...FALLBACK_TIMEZONES];
}

function buildAllTimezoneOptions(): TimezoneOption[] {
  if (cachedTimezoneOptions) {
    return cachedTimezoneOptions;
  }

  cachedTimezoneOptions = listSupportedTimezones()
    .map((value) => ({
      value,
      label: formatTimezoneOptionLabel(value),
      offsetMinutes: getTimezoneUtcOffsetMinutes(value),
    }))
    .sort((a, b) => {
      if (a.offsetMinutes !== b.offsetMinutes) {
        return a.offsetMinutes - b.offsetMinutes;
      }
      return a.value.localeCompare(b.value);
    });

  return cachedTimezoneOptions;
}

export function formatTimezoneOptionLabel(timezone: string): string {
  const readable = timezone.replace(/_/g, ' ');
  return `${formatUtcOffsetLabel(timezone)} · ${readable}`;
}

export function warmupTimezoneOptions(): void {
  buildAllTimezoneOptions();
}

export function buildTimezoneOptions(
  _locale: string,
  extraTimezones: string[] = [],
): TimezoneOption[] {
  const base = buildAllTimezoneOptions();
  const known = new Set(base.map((option) => option.value));
  const extras = extraTimezones
    .map((timezone) => timezone.trim())
    .filter(
      (timezone) =>
        timezone &&
        !known.has(timezone) &&
        isValidIanaTimezone(timezone),
    );

  if (extras.length === 0) {
    return base;
  }

  const merged = [
    ...base,
    ...extras.map((value) => ({
      value,
      label: formatTimezoneOptionLabel(value),
      offsetMinutes: getTimezoneUtcOffsetMinutes(value),
    })),
  ];

  return merged.sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes) {
      return a.offsetMinutes - b.offsetMinutes;
    }
    return a.value.localeCompare(b.value);
  });
}
