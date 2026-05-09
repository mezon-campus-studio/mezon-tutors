"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/components/ui";
import { useGetVerifiedTutors } from "@/services/tutor-profile/tutor-profile.api";
import { useCurrency } from "@/hooks";
import {
  ECountry,
  ESubject,
  ETutorSortBy,
  MAX_PRICE,
  MIN_PRICE,
  ROUTES,
  type VerifiedTutorProfileDto,
} from "@mezon-tutors/shared";
import TutorCard from "./components/TutorCard";
import TutorPreviewCard from "./components/TutorPreviewCard";
import TutorsFilter from "./components/TutorsFilter";
import TutorsPagination from "./components/TutorsPagination";
import { parseIntParam, parseEnumParam } from "@/lib/utils";
import { useTranslations } from "next-intl";

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const PREVIEW_ANIM_MS = 500;

function LoadingTutorCards() {
  return (
    <section className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card
          key={`loading-${idx}`}
          className="border-violet-100 py-0"
        >
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-72" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function LoadingPreviewCard() {
  return (
    <Card className="border-violet-100">
      <CardContent className="space-y-5 p-6">
        <Skeleton className="h-14 w-48" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export default function TutorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPathname = pathname ?? "";
  const currentSearchParams = searchParams ?? new URLSearchParams();
  const t = useTranslations("Tutors");
  const { currency } = useCurrency();
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [subject, setSubject] = useState<ESubject>(ESubject.ANY_SUBJECT);
  const [country, setCountry] = useState<ECountry>(ECountry.ANY_COUNTRY);
  const [minPrice, setMinPrice] = useState<number>(MIN_PRICE[currency]);
  const [maxPrice, setMaxPrice] = useState<number>(MAX_PRICE[currency]);
  const [sortBy, setSortBy] = useState<ETutorSortBy>(ETutorSortBy.POPULARITY);
  const [previewTutor, setPreviewTutor] = useState<VerifiedTutorProfileDto | null>(null);
  const [previewOffsetY, setPreviewOffsetY] = useState(0);
  const listColumnRef = useRef<HTMLDivElement | null>(null);
  const tutorCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const subjectParam = subject === ESubject.ANY_SUBJECT ? undefined : subject;
  const countryParam = country === ECountry.ANY_COUNTRY ? undefined : country;
  const isMaxInfinity = maxPrice === MAX_PRICE[currency];
  const effectiveMaxPrice = isMaxInfinity ? undefined : maxPrice;

  const { data, isLoading, isFetching } = useGetVerifiedTutors(page, DEFAULT_LIMIT, {
    sortBy,
    subject: subjectParam,
    country: countryParam,
    currency,
    minPrice,
    maxPrice: effectiveMaxPrice,
  });

  const items = data?.items ?? [];
  const displayItems = useMemo(() => items, [items]);
  const totalTutors = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;
  const hasItems = displayItems.length > 0;

  const replaceQuery = useCallback(
    (next: Record<string, string | number | null | undefined>) => {
      const sp = new URLSearchParams(currentSearchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === undefined || value === "") {
          sp.delete(key);
        } else {
          sp.set(key, String(value));
        }
      }
      const qs = sp.toString();
      router.replace(qs ? `${currentPathname}?${qs}` : currentPathname);
    },
    [currentPathname, currentSearchParams, router]
  );

  const parsedQuery = useMemo(
    () => ({
      page: parseIntParam(currentSearchParams.get("page"), DEFAULT_PAGE),
      subject: parseEnumParam(
        currentSearchParams.get("subject"),
        Object.values(ESubject),
        ESubject.ANY_SUBJECT
      ),
      country: parseEnumParam(
        currentSearchParams.get("country"),
        Object.values(ECountry),
        ECountry.ANY_COUNTRY
      ),
      minPrice: parseIntParam(currentSearchParams.get("minPrice"), MIN_PRICE[currency]),
      maxPrice: parseIntParam(currentSearchParams.get("maxPrice"), MAX_PRICE[currency]),
      sortBy: parseEnumParam(
        currentSearchParams.get("sortBy"),
        Object.values(ETutorSortBy),
        ETutorSortBy.POPULARITY
      ),
    }),
    [currentSearchParams]
  );

  useEffect(() => {
    const nextMinPrice = MIN_PRICE[currency];
    const nextMaxPrice = MAX_PRICE[currency];
    const nextEffectiveMaxPrice = nextMaxPrice === MAX_PRICE[currency] ? null : nextMaxPrice;

    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
    setPage(DEFAULT_PAGE);

    replaceQuery({
      minPrice: nextMinPrice,
      maxPrice: nextEffectiveMaxPrice,
      page: DEFAULT_PAGE,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  useEffect(() => {
    if (page !== parsedQuery.page) setPage(parsedQuery.page);
    if (subject !== parsedQuery.subject) setSubject(parsedQuery.subject);
    if (country !== parsedQuery.country) setCountry(parsedQuery.country);
    if (minPrice !== parsedQuery.minPrice) setMinPrice(parsedQuery.minPrice);
    if (maxPrice !== parsedQuery.maxPrice) setMaxPrice(parsedQuery.maxPrice);
    if (sortBy !== parsedQuery.sortBy) setSortBy(parsedQuery.sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedQuery]);

  useEffect(() => {
    if (displayItems.length === 0) {
      setPreviewTutor(null);
      setPreviewOffsetY(0);
      return;
    }

    setPreviewTutor((current) => {
      if (current) {
        const updatedCurrent = displayItems.find((item) => item.id === current.id);
        if (updatedCurrent) {
          return updatedCurrent;
        }
      }

      return displayItems[0] ?? null;
    });
  }, [displayItems]);

  const updatePreviewOffset = useCallback((tutorId: string) => {
    const anchor = listColumnRef.current;
    const target = tutorCardRefs.current[tutorId];
    if (!anchor || !target) return;

    const y = target.getBoundingClientRect().top - anchor.getBoundingClientRect().top;
    setPreviewOffsetY(Number.isFinite(y) ? Math.max(0, y) : 0);
  }, []);

  const handlePreviewTutorChange = useCallback(
    (tutor: VerifiedTutorProfileDto) => {
      setPreviewTutor(tutor);
      updatePreviewOffset(tutor.id);
    },
    [updatePreviewOffset]
  );

const handleTutorCardClick = (tutor: VerifiedTutorProfileDto) => {
    window.open(ROUTES.TUTOR.DETAIL(tutor.id), "_blank");
  };

  useEffect(() => {
    if (!previewTutor) return;
    updatePreviewOffset(previewTutor.id);
  }, [previewTutor, updatePreviewOffset, page, subject, country, minPrice, maxPrice, sortBy]);

  const handleSubjectChange = useCallback(
    (value: ESubject) => {
      setSubject(value);
      setPage(DEFAULT_PAGE);
      replaceQuery({
        subject: value === ESubject.ANY_SUBJECT ? null : value,
        page: DEFAULT_PAGE,
      });
    },
    [replaceQuery]
  );

  const handleCountryChange = useCallback(
    (value: ECountry) => {
      setCountry(value);
      setPage(DEFAULT_PAGE);
      replaceQuery({
        country: value === ECountry.ANY_COUNTRY ? null : value,
        page: DEFAULT_PAGE,
      });
    },
    [replaceQuery]
  );

  const handlePriceRangeChange = useCallback(
    (value: { minPrice: number; maxPrice: number }) => {
      setMinPrice(value.minPrice);
      setMaxPrice(value.maxPrice);
      setPage(DEFAULT_PAGE);
      replaceQuery({
        minPrice: value.minPrice,
        maxPrice: value.maxPrice === MAX_PRICE[currency] ? null : value.maxPrice,
        page: DEFAULT_PAGE,
      });
    },
    [replaceQuery, currency]
  );

  const handleSortByChange = useCallback(
    (value: ETutorSortBy) => {
      setSortBy(value);
      setPage(DEFAULT_PAGE);
      replaceQuery({
        sortBy: value === ETutorSortBy.POPULARITY ? null : value,
        page: DEFAULT_PAGE,
      });
    },
    [replaceQuery]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const clamped = Math.max(1, Math.min(totalPages, nextPage));
      setPage(clamped);
      replaceQuery({ page: clamped });
    },
    [replaceQuery, totalPages]
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
      <div className="mb-5 space-y-3">
        <TutorsFilter
          subject={subject}
          country={country}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onSubjectChangeAction={handleSubjectChange}
          onCountryChangeAction={handleCountryChange}
          onPriceRangeChangeAction={handlePriceRangeChange}
        />
      </div>

      <section className="grid gap-6 lg:grid-cols-12">
        <div
          className="lg:col-span-8"
          ref={listColumnRef}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xl font-medium text-slate-600">
              {t.rich("Screen.totalLabelNoSubject", {
                value: totalTutors,
                highlight: (chunks) => <span className="text-primary text-2xl">{chunks}</span>,
              })}
            </span>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{t("Screen.sortBy")}</span>
              <Select
                value={sortBy}
                onValueChange={(value) => handleSortByChange(value as ETutorSortBy)}
              >
                <SelectTrigger
                  className="h-11! w-44 px-3 text-base cursor-pointer"
                  size="default"
                >
                  <SelectValue placeholder={t("Screen.popularity")}>
                    {t(`Screen.${sortBy}`)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ETutorSortBy).map((value) => (
                    <SelectItem
                      key={value}
                      value={value}
                    >
                      {t(`Screen.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLoading ? <LoadingTutorCards /> : null}

          {!isLoading && !hasItems ? (
            <Card className="border-violet-100">
              <CardContent className="p-8 text-center text-slate-600">
                {t("Screen.empty")}
              </CardContent>
            </Card>
          ) : (
            <section className="space-y-4">
              {displayItems.map((tutor: VerifiedTutorProfileDto) => (
                <div
                  key={tutor.id}
                  ref={(node) => {
                    tutorCardRefs.current[tutor.id] = node;
                  }}
                >
                  <TutorCard
                    tutor={tutor}
                    isActive={previewTutor?.id === tutor.id}
                    onHoverAction={handlePreviewTutorChange}
                    onSelectAction={handleTutorCardClick}
                  />
                </div>
              ))}
            </section>
          )}

          <div className="mt-6">
            <TutorsPagination
              page={page}
              totalPages={totalPages}
              isFetching={isFetching}
              onPageChangeAction={handlePageChange}
            />
          </div>
        </div>

        <div className="hidden lg:col-span-4 lg:block">
          {isLoading ? (
            <LoadingPreviewCard />
          ) : (
            <div
              style={{
                transform: `translate3d(0, ${previewOffsetY}px, 0)`,
                transition: `transform ${PREVIEW_ANIM_MS}ms ease`,
                willChange: "transform",
              }}
            >
              <TutorPreviewCard tutor={previewTutor} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
