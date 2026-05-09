"use client";

import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@/components/ui";
import { ECountry, ESubject, formatToCurrency, MAX_PRICE, MIN_PRICE, PRICE_STEP } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks";

type TutorsFilterProps = {
  subject: ESubject;
  country: ECountry;
  minPrice: number;
  maxPrice: number;
  onSubjectChangeAction: (value: ESubject) => void;
  onCountryChangeAction: (value: ECountry) => void;
  onPriceRangeChangeAction: (value: { minPrice: number; maxPrice: number }) => void;
};

export default function TutorsFilter({
  subject,
  country,
  minPrice,
  maxPrice,
  onSubjectChangeAction,
  onCountryChangeAction,
  onPriceRangeChangeAction,
}: TutorsFilterProps) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tCountry = useTranslations("Tutors.Filter.Country");
  const { currency } = useCurrency();
  const [priceRange, setPriceRange] = useState<number[]>(() => [minPrice, maxPrice]);

  useEffect(() => {
    setPriceRange([minPrice, maxPrice]);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const isMaxInfinity = priceRange[1] === MAX_PRICE[currency];
  const priceLabel = `${formatToCurrency(currency, priceRange[0] ?? 0)} - ${formatToCurrency(
    currency,
    priceRange[1] ?? 0
  )}${isMaxInfinity ? "+" : ""}`;

  const handlePriceRangeChange = (value: number | readonly number[]) => {
    const nextValue = Array.isArray(value) ? [...value] : [value];
    setPriceRange(nextValue);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onPriceRangeChangeAction({
        minPrice: nextValue[0] ?? 0,
        maxPrice: nextValue[1] ?? 0,
      });
    }, 350);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Select
        value={subject}
        onValueChange={(value) =>
          onSubjectChangeAction((value as ESubject | null) ?? ESubject.ANY_SUBJECT)
        }
      >
        <SelectTrigger
          className="h-14! w-full px-3 text-lg cursor-pointer"
          size="default"
        >
          <SelectValue placeholder={tSubject(ESubject.ANY_SUBJECT)}>
            {tSubject(subject)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(ESubject).map((value) => (
            <SelectItem
              key={value}
              value={value}
            >
              {tSubject(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-col h-14 gap-1 items-center rounded-lg border border-primary bg-background px-4">
        <span className="text-lg font-bold text-foreground whitespace-nowrap line-clamp-1">{priceLabel}</span>
        <Slider
          className="cursor-pointer **:data-[slot=slider-track]:data-horizontal:h-2 **:data-[slot=slider-thumb]:size-4 **:data-[slot=slider-thumb]:border-2 **:data-[slot=slider-thumb]:bg-background **:data-[slot=slider-thumb]:shadow-sm"
          value={priceRange}
          min={MIN_PRICE[currency]}
          max={MAX_PRICE[currency]}
          step={PRICE_STEP[currency]}
          onValueChange={handlePriceRangeChange}
        />
      </div>

      <Select
        value={country}
        onValueChange={(value) =>
          onCountryChangeAction((value as ECountry | null) ?? ECountry.ANY_COUNTRY)
        }
      >
        <SelectTrigger
          className="h-14! w-full px-3 text-lg cursor-pointer"
          size="default"
        >
          <SelectValue placeholder={tCountry(ECountry.ANY_COUNTRY)}>
            {tCountry(country)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(ECountry).map((value) => (
            <SelectItem
              key={value}
              value={value}
            >
              {tCountry(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
