"use client";

import {
  ECountry,
  ESubject,
  formatToCurrency,
  MAX_PRICE,
  MIN_PRICE,
  PRICE_STEP,
} from "@mezon-tutors/shared";
import { BookOpen, Globe2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@/components/ui";
import { useCurrency } from "@/hooks";

type TutorsFilterProps = {
  subject: ESubject;
  country: ECountry;
  minPrice: number;
  maxPrice: number;
  onSubjectChangeAction: (value: ESubject) => void;
  onCountryChangeAction: (value: ECountry) => void;
  onPriceRangeChangeAction: (value: {
    minPrice: number;
    maxPrice: number;
  }) => void;
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
  const [priceRange, setPriceRange] = useState<number[]>(() => [
    minPrice,
    maxPrice,
  ]);

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
    priceRange[1] ?? 0,
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
    <div className="rounded-3xl border border-violet-100 bg-white/80 p-3 shadow-sm shadow-violet-100/40 backdrop-blur">
      <div className="grid gap-2 md:grid-cols-3">
        <Select
          value={subject}
          onValueChange={(value) =>
            onSubjectChangeAction(
              (value as ESubject | null) ?? ESubject.ANY_SUBJECT,
            )
          }
        >
          <SelectTrigger
            className="group h-16! w-full rounded-2xl border-transparent bg-white px-3 text-left transition-all hover:bg-violet-50/40 aria-expanded:border-violet-300 aria-expanded:bg-violet-50/40 data-[state=open]:border-violet-300"
            size="default"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
                <BookOpen className="size-5" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Subject
                </span>
                <SelectValue placeholder={tSubject(ESubject.ANY_SUBJECT)}>
                  <span className="text-base font-semibold text-slate-900">
                    {tSubject(subject)}
                  </span>
                </SelectValue>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.values(ESubject).map((value) => (
              <SelectItem key={value} value={value}>
                {tSubject(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="group flex h-16 items-center gap-3 rounded-2xl bg-white px-3 transition-all hover:bg-violet-50/40">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#fce7f3,#fbcfe8)] text-fuchsia-700 ring-1 ring-fuchsia-100">
            <Wallet className="size-5" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 leading-tight">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Price range
              </span>
              <span className="line-clamp-1 text-xs font-bold text-violet-700">
                {priceLabel}
              </span>
            </div>
            <Slider
              className="cursor-pointer **:data-[slot=slider-track]:data-horizontal:h-1.5 **:data-[slot=slider-track]:data-horizontal:bg-violet-100 **:data-[slot=slider-thumb]:size-4 **:data-[slot=slider-thumb]:border-2 **:data-[slot=slider-thumb]:border-violet-600 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:shadow-md"
              value={priceRange}
              min={MIN_PRICE[currency]}
              max={MAX_PRICE[currency]}
              step={PRICE_STEP[currency]}
              onValueChange={handlePriceRangeChange}
            />
          </div>
        </div>

        <Select
          value={country}
          onValueChange={(value) =>
            onCountryChangeAction(
              (value as ECountry | null) ?? ECountry.ANY_COUNTRY,
            )
          }
        >
          <SelectTrigger
            className="group h-16! w-full rounded-2xl border-transparent bg-white px-3 text-left transition-all hover:bg-violet-50/40 aria-expanded:border-violet-300 aria-expanded:bg-violet-50/40 data-[state=open]:border-violet-300"
            size="default"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#dbeafe,#ede9fe)] text-indigo-700 ring-1 ring-indigo-100">
                <Globe2 className="size-5" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Country
                </span>
                <SelectValue placeholder={tCountry(ECountry.ANY_COUNTRY)}>
                  <span className="text-base font-semibold text-slate-900">
                    {tCountry(country)}
                  </span>
                </SelectValue>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.values(ECountry).map((value) => (
              <SelectItem key={value} value={value}>
                {tCountry(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
