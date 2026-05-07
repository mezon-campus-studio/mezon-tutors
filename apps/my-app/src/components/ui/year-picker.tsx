'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { YEAR_PICKER_CONFIG } from '@mezon-tutors/shared';

interface YearPickerProps {
  value?: string;
  onChange?: (year: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
}

export function YearPicker({
  value,
  onChange,
  placeholder = 'Chọn năm',
  disabled,
  className,
  minYear = YEAR_PICKER_CONFIG.minYear,
  maxYear = YEAR_PICKER_CONFIG.maxYear,
}: YearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const currentYear = new Date().getFullYear();
  const [displayStartYear, setDisplayStartYear] = React.useState(
    value ? Math.floor(parseInt(value) / 12) * 12 : Math.floor(currentYear / 12) * 12
  );

  const years = React.useMemo(() => {
    const yearList = [];
    for (let i = 0; i < 12; i++) {
      const year = displayStartYear + i;
      if (year >= minYear && year <= maxYear) {
        yearList.push(year);
      }
    }
    return yearList;
  }, [displayStartYear, minYear, maxYear]);

  const handleSelect = (year: number) => {
    onChange?.(year.toString());
    setOpen(false);
  };

  const handlePrevious = () => {
    setDisplayStartYear((prev) => Math.max(prev - 12, minYear));
  };

  const handleNext = () => {
    setDisplayStartYear((prev) => Math.min(prev + 12, maxYear - 11));
  };

  const canGoPrevious = displayStartYear > minYear;
  const canGoNext = displayStartYear + 11 < maxYear;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground',
          className
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value || placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold">
              {displayStartYear} - {displayStartYear + 11}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleNext}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {years.map((year) => (
              <Button
                key={year}
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(year)}
                className={cn(
                  'h-9 w-full font-normal',
                  value === year.toString() &&
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  year === currentYear && value !== year.toString() && 'border border-primary'
                )}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
