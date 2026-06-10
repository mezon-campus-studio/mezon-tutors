'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minTime?: string;
  maxTime?: string;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function TimePicker({
  value,
  onChange,
  placeholder = '09:00',
  minTime,
  maxTime,
}: TimePickerProps) {
  const t = useTranslations('BecomeTutor.availability.availability');
  const [isOpen, setIsOpen] = useState(false);
  const [hours, minutes] = value.split(':');
  const [inputValue, setInputValue] = useState(value);
  const [hasMinuteError, setHasMinuteError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);

  const minMins = minTime ? toMinutes(minTime) : 0;
  const maxMins = maxTime ? toMinutes(maxTime) : 23 * 60 + 30;

  function isHourDisabled(hour: string): boolean {
    const h = parseInt(hour);
    const opts = [h * 60, h * 60 + 30];
    return opts.every((m) => m < minMins || m > maxMins);
  }

  function isMinuteDisabled(minute: string): boolean {
    if (!hours) return false;
    const total = parseInt(hours) * 60 + parseInt(minute);
    return total < minMins || total > maxMins;
  }

  useEffect(() => {
    setInputValue(value);
    setHasMinuteError(false);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (hours && hourListRef.current) {
        const selectedHour = hourListRef.current.querySelector(`[data-hour="${hours}"]`);
        selectedHour?.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [isOpen, hours]);

  const handleHourSelect = (hour: string) => {
    if (isHourDisabled(hour)) return;
    const currentMinute = minutes || '00';
    const newMinute = isMinuteDisabledForHour(hour, currentMinute)
      ? getFirstValidMinute(hour)
      : currentMinute;
    if (!newMinute) return;
    const newValue = `${hour}:${newMinute}`;
    onChange(newValue);
    setInputValue(newValue);
    setHasMinuteError(false);
  };

  function isMinuteDisabledForHour(hour: string, minute: string): boolean {
    const total = parseInt(hour) * 60 + parseInt(minute);
    return total < minMins || total > maxMins;
  }

  function getFirstValidMinute(hour: string): string | null {
    return ['00', '30'].find((m) => !isMinuteDisabledForHour(hour, m)) ?? null;
  }

  const handleMinuteSelect = (minute: string) => {
    if (isMinuteDisabled(minute)) return;
    const newValue = `${hours || '09'}:${minute}`;
    onChange(newValue);
    setInputValue(newValue);
    setHasMinuteError(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    if (text === '') return;

    const cleanText = text.replace(/[^\d:]/g, '');
    if (cleanText.match(/^\d{2}:\d{2}$/)) {
      const [h, m] = cleanText.split(':');
      const hourNum = parseInt(h);
      const minuteNum = parseInt(m);
      const totalMins = hourNum * 60 + minuteNum;

      if (
        hourNum >= 0 &&
        hourNum <= 23 &&
        (minuteNum === 0 || minuteNum === 30) &&
        totalMins >= minMins &&
        totalMins <= maxMins
      ) {
        onChange(cleanText);
        setHasMinuteError(false);
      } else if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
        setHasMinuteError(true);
      }
    }
  };

  const handleInputBlur = () => {
    if (!inputValue.match(/^\d{2}:\d{2}$/)) {
      setHasMinuteError(false);
      setInputValue(value);
      return;
    }
    const [h, m] = inputValue.split(':');
    const hourNum = Number(h);
    const minuteNum = Number(m);
    const totalMins = hourNum * 60 + minuteNum;

    if (
      Number.isNaN(hourNum) ||
      Number.isNaN(minuteNum) ||
      hourNum < 0 ||
      hourNum > 23 ||
      (minuteNum !== 0 && minuteNum !== 30) ||
      totalMins < minMins ||
      totalMins > maxMins
    ) {
      setHasMinuteError(true);
      setInputValue(value);
      return;
    }
    setHasMinuteError(false);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = ['00', '30'];

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`pr-8 ${hasMinuteError ? 'border-destructive ring-destructive/30' : ''}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown size={16} />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex h-full">
            {/* Hours column */}
            <div
              ref={hourListRef}
              className="no-scrollbar max-h-72 flex-1 overflow-y-auto border-r border-gray-200"
            >
              <div className="sticky top-0 border-b border-gray-100 bg-white px-2 py-1">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('hour')}
                </span>
              </div>
              {hourOptions.map((hour) => {
                const disabled = isHourDisabled(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    data-hour={hour}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-center text-sm transition-colors ${
                      disabled
                        ? 'cursor-not-allowed text-gray-300'
                        : hours === hour
                          ? 'bg-blue-50 font-medium text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleHourSelect(hour)}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>

            {/* Minutes column */}
            <div className="flex-1 overflow-hidden">
              <div className="sticky top-0 border-b border-gray-100 bg-white px-2 py-1">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('minute')}
                </span>
              </div>
              {minuteOptions.map((minute) => {
                const disabled = isMinuteDisabled(minute);
                return (
                  <button
                    key={minute}
                    type="button"
                    data-minute={minute}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-center text-sm transition-colors ${
                      disabled
                        ? 'cursor-not-allowed text-gray-300'
                        : minutes === minute
                          ? 'bg-blue-50 font-medium text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleMinuteSelect(minute)}
                  >
                    {minute}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}