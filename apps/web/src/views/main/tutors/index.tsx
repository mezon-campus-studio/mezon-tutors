"use client";

import {
  ECountry,
  ECurrency,
  ESubject,
  ETutorSortBy,
  MAX_PRICE,
  MIN_PRICE,
  ROUTES,
  type VerifiedTutorProfileDto,
} from "@mezon-tutors/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, SearchX } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/components/ui";
import { useCurrency } from "@/hooks";
import { parseEnumParam, parseIntParam } from "@/lib/utils";
import { useGetVerifiedTutors } from "@/services/tutor-profile/tutor-profile.api";
import TutorCard from "./components/TutorCard";
import TutorPreviewCard from "./components/TutorPreviewCard";
import TutorsFilter from "./components/TutorsFilter";
import TutorsPagination from "./components/TutorsPagination";
import ReactGA from "react-ga4";

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const PREVIEW_ANIM_MS = 500;

function parseTutorsSearchParams(
  searchParams: URLSearchParams,
  currency: ECurrency,
) {
  return {
    page: parseIntParam(searchParams.get("page"), DEFAULT_PAGE),
    subject: parseEnumParam(
      searchParams.get("subject"),
      Object.values(ESubject),
      ESubject.ANY_SUBJECT,
    ),
    country: parseEnumParam(
      searchParams.get("country"),
      Object.values(ECountry),
      ECountry.ANY_COUNTRY,
    ),
    minPrice: parseIntParam(
      searchParams.get("minPrice"),
      MIN_PRICE[currency],
    ),
    maxPrice: parseIntParam(
      searchParams.get("maxPrice"),
      MAX_PRICE[currency],
    ),
    sortBy: parseEnumParam(
      searchParams.get("sortBy"),
      Object.values(ETutorSortBy),
      ETutorSortBy.POPULARITY,
    ),
  };
}

function LoadingTutorCards() {
  return (
    <section className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={`loading-${idx}`} className="border-violet-100 py-0">
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
    <Card className="border-violet-100 bg-white">
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
  const searchParamsString = searchParams?.toString() ?? "";
  const t = useTranslations("Tutors");
  const { currency } = useCurrency();
  const initialQuery = parseTutorsSearchParams(
    new URLSearchParams(searchParamsString),
    currency,
  );
  const [page, setPage] = useState(initialQuery.page);
  const [subject, setSubject] = useState<ESubject>(initialQuery.subject);
  const [country, setCountry] = useState<ECountry>(initialQuery.country);
  const [minPrice, setMinPrice] = useState<number>(initialQuery.minPrice);
  const [maxPrice, setMaxPrice] = useState<number>(initialQuery.maxPrice);
  const [sortBy, setSortBy] = useState<ETutorSortBy>(initialQuery.sortBy);
  const isInitialCurrencyMount = useRef(true);
  const [previewTutor, setPreviewTutor] =
    useState<VerifiedTutorProfileDto | null>(null);
  const [previewOffsetY, setPreviewOffsetY] = useState(0);
  const listColumnRef = useRef<HTMLDivElement | null>(null);
  const tutorCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const subjectParam = subject === ESubject.ANY_SUBJECT ? undefined : subject;
  const countryParam = country === ECountry.ANY_COUNTRY ? undefined : country;
  const isMinInfinity = minPrice === MIN_PRICE[currency];
  const isMaxInfinity = maxPrice === MAX_PRICE[currency];
  const effectiveMinPrice = isMinInfinity ? undefined : minPrice;
  const effectiveMaxPrice = isMaxInfinity ? undefined : maxPrice;

  const { data, isLoading, isFetching } = useGetVerifiedTutors(
    page,
    DEFAULT_LIMIT,
    {
      sortBy,
      subject: subjectParam,
      country: countryParam,
      currency,
      minPrice: effectiveMinPrice,
      maxPrice: effectiveMaxPrice,
    },
  );

  const items = data?.items ?? [];
  const displayItems = useMemo(() => items, [items]);
  const totalTutors = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;
  const hasItems = displayItems.length > 0;

  const replaceQuery = useCallback(
    (next: Record<string, string | number | null | undefined>) => {
      const sp = new URLSearchParams(searchParamsString);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === undefined || value === "") {
          sp.delete(key);
        } else {
          sp.set(key, String(value));
        }
      }
      const qs = sp.toString();
      const nextUrl = qs ? `${currentPathname}?${qs}` : currentPathname;
      const currentUrl = searchParamsString
        ? `${currentPathname}?${searchParamsString}`
        : currentPathname;
      if (nextUrl === currentUrl) {
        return;
      }
      router.replace(nextUrl);
    },
    [currentPathname, searchParamsString, router],
  );

  const parsedQuery = useMemo(
    () =>
      parseTutorsSearchParams(
        new URLSearchParams(searchParamsString),
        currency,
      ),
    [searchParamsString, currency],
  );

  useEffect(() => {
    if (isInitialCurrencyMount.current) {
      isInitialCurrencyMount.current = false;
      return;
    }

    const nextMinPrice = MIN_PRICE[currency];
    const nextMaxPrice = MAX_PRICE[currency];

    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
    setPage(DEFAULT_PAGE);

    replaceQuery({
      minPrice: null,
      maxPrice: null,
      page: null,
    });
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
        const updatedCurrent = displayItems.find(
          (item) => item.id === current.id,
        );
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

    const y =
      target.getBoundingClientRect().top - anchor.getBoundingClientRect().top;
    setPreviewOffsetY(Number.isFinite(y) ? Math.max(0, y) : 0);
  }, []);

  const handlePreviewTutorChange = useCallback(
    (tutor: VerifiedTutorProfileDto) => {
      setPreviewTutor(tutor);
      updatePreviewOffset(tutor.id);
    },
    [updatePreviewOffset],
  );

  const handleTutorCardClick = (tutor: VerifiedTutorProfileDto) => {
    ReactGA.event("tutor_card_click", { tutor_id: tutor.id, tutor_name: `${tutor.firstName} ${tutor.lastName}` });
    window.open(ROUTES.TUTOR.DETAIL(tutor.id), "_blank");
  };

  useEffect(() => {
    if (!previewTutor) return;
    updatePreviewOffset(previewTutor.id);
  }, [
    previewTutor,
    updatePreviewOffset,
    page,
    subject,
    country,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const handleSubjectChange = useCallback(
    (value: ESubject) => {
      setSubject(value);
      setPage(DEFAULT_PAGE);
      replaceQuery({
        subject: value === ESubject.ANY_SUBJECT ? null : value,
        page: DEFAULT_PAGE,
      });
    },
    [replaceQuery],
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
    [replaceQuery],
  );

  const handlePriceRangeChange = useCallback(
    (value: { minPrice: number; maxPrice: number }) => {
      setMinPrice(value.minPrice);
      setMaxPrice(value.maxPrice);
      setPage(DEFAULT_PAGE);
      replaceQuery({
        minPrice:
          value.minPrice === MIN_PRICE[currency] ? null : value.minPrice,
        maxPrice:
          value.maxPrice === MAX_PRICE[currency] ? null : value.maxPrice,
        page: DEFAULT_PAGE,
      });
    },
    [replaceQuery, currency],
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
    [replaceQuery],
  );

  const handleResetFilters = useCallback(() => {
    const defaultMin = MIN_PRICE[currency];
    const defaultMax = MAX_PRICE[currency];
    setSubject(ESubject.ANY_SUBJECT);
    setCountry(ECountry.ANY_COUNTRY);
    setMinPrice(defaultMin);
    setMaxPrice(defaultMax);
    setSortBy(ETutorSortBy.POPULARITY);
    setPage(DEFAULT_PAGE);
    replaceQuery({
      subject: null,
      country: null,
      minPrice: null,
      maxPrice: null,
      sortBy: null,
      page: DEFAULT_PAGE,
    });
  }, [replaceQuery, currency]);

  const hasActiveFilters =
    subject !== ESubject.ANY_SUBJECT ||
    country !== ECountry.ANY_COUNTRY ||
    minPrice !== MIN_PRICE[currency] ||
    maxPrice !== MAX_PRICE[currency];

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const clamped = Math.max(1, Math.min(totalPages, nextPage));
      setPage(clamped);
      replaceQuery({
        page: clamped === DEFAULT_PAGE ? null : clamped,
      });
    },
    [replaceQuery, totalPages],
  );

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)]" />
      <div className="pointer-events-none absolute -top-20 left-1/2 -z-10 size-[40rem] -translate-x-1/2 rounded-full bg-violet-200/30 blur-[120px]" />

      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-10 lg:px-10">
        <div className="mb-6 space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t.rich("Screen.heroTitle", {
              highlight: (chunks) => (
                <span className="text-brand-gradient">{chunks}</span>
              ),
            })}
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            {t("Screen.heroSubtitle")}
          </p>
        </div>

        <div className="mb-6 space-y-3">
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
          <div className="lg:col-span-8" ref={listColumnRef}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white/60 px-4 py-3 backdrop-blur">
              <span className="text-base text-slate-600">
                {t.rich("Screen.totalLabelNoSubject", {
                  value: totalTutors,
                  highlight: (chunks) => (
                    <span className="text-brand-gradient text-xl font-extrabold">
                      {chunks}
                    </span>
                  ),
                })}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("Screen.sortBy")}
                </span>
                <Select
                  value={sortBy}
                  onValueChange={(value) =>
                    handleSortByChange(value as ETutorSortBy)
                  }
                >
                  <SelectTrigger
                    className="h-10! w-44 cursor-pointer rounded-full border-violet-200 bg-white px-4 text-sm font-semibold transition hover:border-violet-300 hover:bg-violet-50/50"
                    size="default"
                  >
                    <SelectValue placeholder={t("Screen.popularity")}>
                      {t(`Screen.${sortBy}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ETutorSortBy).map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`Screen.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isLoading ? <LoadingTutorCards /> : null}

            {!isLoading && !hasItems ? (
              <Card className="overflow-hidden border-violet-100 py-0">
                <CardContent className="relative px-6 py-14">
                  <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -top-20 left-1/2 size-80 -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
                  </div>
                  <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-2xl" />
                      <div className="flex size-20 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] ring-1 ring-violet-100">
                        <SearchX
                          className="size-9 text-violet-600"
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <h3 className="mb-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
                      {t("Screen.emptyTitle")}
                    </h3>
                    <p className="mb-6 text-sm leading-6 text-slate-600">
                      {t("Screen.emptyDescription")}
                    </p>
                    {hasActiveFilters ? (
                      <Button
                        size="lg"
                        className="group h-11 rounded-full bg-brand-gradient px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
                        onClick={handleResetFilters}
                      >
                        <RotateCcw className="mr-1.5 size-4 transition-transform group-hover:-rotate-180" />
                        {t("Screen.clearFilters")}
                      </Button>
                    ) : (
                      <p className="text-xs font-medium text-slate-400">
                        {t("Screen.noTutorsNoFilter")}
                      </p>
                    )}
                  </div>
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
                className="relative z-10 rounded-xl bg-white"
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
      </div>
    </main>
  );
}
