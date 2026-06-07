"use client";

import type { CSSProperties } from "react";
import {
  ECurrency,
  ECountry,
  ELanguage,
  EProficiencyLevel,
  ESubject,
  ETutorSortBy,
  formatToCurrency,
  ROUTES,
  type VerifiedTutorProfileDto,
} from "@mezon-tutors/shared";
import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";
import { useCurrency } from "@/hooks";
import { useGetVerifiedTutors } from "@/services/tutor-profile/tutor-profile.api";

const FEATURED_MOCK_USER_ID = "__FEATURED_MOCK__";

const HEADER_DOT_PATTERN: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
  backgroundSize: "16px 16px",
};

const FEATURED_GRADIENTS = [
  "from-violet-500 via-purple-500 to-fuchsia-500",
  "from-indigo-500 via-violet-500 to-purple-500",
  "from-fuchsia-500 via-rose-500 to-orange-500",
  "from-purple-500 via-fuchsia-500 to-rose-500",
] as const;

const MOCK_FEATURED_TUTORS: VerifiedTutorProfileDto[] = [
  {
    id: "featured-mock-1",
    userId: FEATURED_MOCK_USER_ID,
    mezonUserId: "",
    firstName: "Linh",
    lastName: "Pham",
    avatar: "",
    videoUrl: "",
    country: ECountry.VIETNAM,
    subject: ESubject.ENGLISH,
    introduce: "",
    experience: "",
    motivate: "",
    headline: "IELTS 8.5 · 6 yrs experience",
    prices: {
      baseCurrency: ECurrency.USD,
      usd: 15,
      vnd: 375_000,
      php: 850,
    },
    isProfessional: true,
    totalLessonsTaught: 1240,
    totalStudents: 420,
    ratingCount: 180,
    ratingAverage: 5,
    timezone: "Asia/Ho_Chi_Minh",
    languages: [
      { languageCode: ELanguage.ENGLISH, proficiency: EProficiencyLevel.NATIVE },
      {
        languageCode: ELanguage.VIETNAMESE,
        proficiency: EProficiencyLevel.FLUENT,
      },
    ],
  },
  {
    id: "featured-mock-2",
    userId: FEATURED_MOCK_USER_ID,
    mezonUserId: "",
    firstName: "James",
    lastName: "O'Connor",
    avatar: "",
    videoUrl: "",
    country: ECountry.UNITED_KINGDOM,
    subject: ESubject.ENGLISH,
    introduce: "",
    experience: "",
    motivate: "",
    headline: "Native English · Business coach",
    prices: {
      baseCurrency: ECurrency.USD,
      usd: 24,
      vnd: 600_000,
      php: 1360,
    },
    isProfessional: true,
    totalLessonsTaught: 980,
    totalStudents: 310,
    ratingCount: 140,
    ratingAverage: 4.9,
    timezone: "Europe/London",
    languages: [
      { languageCode: ELanguage.ENGLISH, proficiency: EProficiencyLevel.NATIVE },
      {
        languageCode: ELanguage.FRENCH,
        proficiency: EProficiencyLevel.INTERMEDIATE,
      },
    ],
  },
  {
    id: "featured-mock-3",
    userId: FEATURED_MOCK_USER_ID,
    mezonUserId: "",
    firstName: "Emma",
    lastName: "Wilson",
    avatar: "",
    videoUrl: "",
    country: ECountry.UNITED_STATES,
    subject: ESubject.ENGLISH,
    introduce: "",
    experience: "",
    motivate: "",
    headline: "TESOL · Conversational coach",
    prices: {
      baseCurrency: ECurrency.USD,
      usd: 20,
      vnd: 500_000,
      php: 1130,
    },
    isProfessional: false,
    totalLessonsTaught: 760,
    totalStudents: 220,
    ratingCount: 95,
    ratingAverage: 5,
    timezone: "America/New_York",
    languages: [
      { languageCode: ELanguage.ENGLISH, proficiency: EProficiencyLevel.NATIVE },
      {
        languageCode: ELanguage.SPANISH,
        proficiency: EProficiencyLevel.FLUENT,
      },
    ],
  },
  {
    id: "featured-mock-4",
    userId: FEATURED_MOCK_USER_ID,
    mezonUserId: "",
    firstName: "David",
    lastName: "Brown",
    avatar: "",
    videoUrl: "",
    country: ECountry.AUSTRALIA,
    subject: ESubject.ENGLISH,
    introduce: "",
    experience: "",
    motivate: "",
    headline: "CELTA · Kids & beginners",
    prices: {
      baseCurrency: ECurrency.USD,
      usd: 18,
      vnd: 450_000,
      php: 1020,
    },
    isProfessional: true,
    totalLessonsTaught: 540,
    totalStudents: 160,
    ratingCount: 72,
    ratingAverage: 4.9,
    timezone: "Australia/Sydney",
    languages: [
      { languageCode: ELanguage.ENGLISH, proficiency: EProficiencyLevel.NATIVE },
    ],
  },
];

function tutorInitials(tutor: VerifiedTutorProfileDto): string {
  const a = tutor.firstName?.trim()?.[0] ?? "";
  const b = tutor.lastName?.trim()?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

function trialLessonPrice(
  tutor: VerifiedTutorProfileDto,
  currency: ECurrency
): number {
  const p = tutor.prices;
  if (currency === ECurrency.USD) return p.usd ?? 0;
  if (currency === ECurrency.PHP) return p.php ?? 0;
  return p.vnd ?? 0;
}

function profileHrefFor(tutor: VerifiedTutorProfileDto): string {
  return tutor.userId === FEATURED_MOCK_USER_ID
    ? ROUTES.TUTOR.INDEX
    : ROUTES.TUTOR.DETAIL(tutor.id);
}

type FeaturedTutorCardProps = {
  tutor: VerifiedTutorProfileDto;
  gradient: string;
  currency: ECurrency;
};

function FeaturedTutorCard({ tutor, gradient, currency }: FeaturedTutorCardProps) {
  const t = useTranslations("Home.FeaturedTutors");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tCountry = useTranslations("Tutors.Filter.Country");
  const tLanguage = useTranslations("Tutors.Filter.Language");

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const price = trialLessonPrice(tutor, currency);
  const rateLabel = formatToCurrency(currency, price);
  const rating =
    tutor.ratingCount > 0 ? tutor.ratingAverage.toFixed(1) : "—";
  const subjectKey = tutor.subject?.trim();
  const hasSubject =
    Boolean(subjectKey) && subjectKey !== ESubject.ANY_SUBJECT;
  const detailHref = profileHrefFor(tutor);
  const isMockProfile = tutor.userId === FEATURED_MOCK_USER_ID;

  const cta = (
    <Link
      href={detailHref}
      className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-full bg-violet-600 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
    >
      {t("bookTrial")}
      <ArrowRight className="ml-1 size-3.5" />
    </Link>
  );

  const titleName = isMockProfile ? (
    <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-violet-700">
      {name}
    </h3>
  ) : (
    <Link href={detailHref}>
      <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-violet-700">
        {name}
      </h3>
    </Link>
  );

  const avatarInner = tutor.avatar ? (
    <Image
      src={tutor.avatar}
      alt={name}
      fill
      className="object-cover"
      sizes="80px"
    />
  ) : (
    tutorInitials(tutor)
  );

  const avatar = isMockProfile ? (
    <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-2xl font-extrabold text-violet-700 shadow-lg">
      {avatarInner}
    </div>
  ) : (
    <Link
      href={detailHref}
      className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-2xl font-extrabold text-violet-700 shadow-lg"
    >
      {avatarInner}
    </Link>
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-200/50">
      <div className={`relative h-36 bg-gradient-to-br ${gradient}`}>
        <div
          className="absolute inset-0 opacity-30"
          style={HEADER_DOT_PATTERN}
        />
        <div className="absolute inset-x-4 -bottom-10 flex items-end justify-between">
          {avatar}
          <span className="mb-2 max-w-[55%] truncate rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur">
            {tCountry(tutor.country)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-12">
        <div>
          {titleName}
          <p className="line-clamp-2 text-xs leading-5 text-slate-500">
            {tutor.headline || (hasSubject ? tSubject(subjectKey) : "")}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {hasSubject ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
              {tSubject(subjectKey)}
            </span>
          ) : null}
          {tutor.languages?.slice(0, 2).map((language) => (
            <span
              key={`${tutor.id}-${language.languageCode}-${language.proficiency}`}
              className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700"
            >
              {tLanguage(language.languageCode as unknown as string)}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-violet-50 pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-xs">
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-600">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {rating}
            </span>
            <span className="truncate text-slate-400">
              {tutor.totalLessonsTaught} {t("lessons")}
            </span>
          </div>
          <div className="shrink-0 pl-2 text-right">
            <p className="text-base font-extrabold leading-none text-slate-900">
              {rateLabel}
            </p>
            <p className="text-[10px] font-medium text-slate-500">
              {t("perHour")}
            </p>
          </div>
        </div>

        {cta}
      </div>
    </article>
  );
}

function FeaturedTutorCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
      <div className="h-36 animate-pulse bg-violet-100/80" />
      <div className="flex flex-1 flex-col gap-3 p-5 pt-12">
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-auto h-9 w-full animate-pulse rounded-full bg-violet-100" />
      </div>
    </div>
  );
}

export default function HomeFeaturedTutorsSection() {
  const t = useTranslations("Home.FeaturedTutors");
  const { currency } = useCurrency();
  const { data, isPending, isError } = useGetVerifiedTutors(1, 4, {
    sortBy: ETutorSortBy.POPULARITY,
    currency,
  });

  const apiTutors = data?.items ?? [];
  const hasApiTutors = !isError && apiTutors.length > 0;
  const showMock = !hasApiTutors && (!isPending || isError);
  const showSkeleton = isPending && !isError && !hasApiTutors;

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between sm:mb-10">
          <div className="max-w-2xl space-y-3">
            <Badge className="h-auto rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              {t("badge")}
            </Badge>
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              {t("title")}
            </h2>
            <p className="text-slate-600">{t("description")}</p>
          </div>
          <Link href="/tutors">
            <Button
              variant="outline"
              className="h-10 w-fit rounded-full px-5 text-sm font-semibold"
            >
              {t("viewAll")}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {showSkeleton
            ? Array.from({ length: 4 }).map((_, i) => (
                <FeaturedTutorCardSkeleton key={`sk-${i}`} />
              ))
            : null}

          {hasApiTutors
            ? apiTutors.slice(0, 4).map((tutor, index) => (
                <FeaturedTutorCard
                  key={tutor.id}
                  tutor={tutor}
                  gradient={
                    FEATURED_GRADIENTS[index % FEATURED_GRADIENTS.length]
                  }
                  currency={currency}
                />
              ))
            : null}

          {showMock
            ? MOCK_FEATURED_TUTORS.map((tutor, index) => (
                <FeaturedTutorCard
                  key={tutor.id}
                  tutor={tutor}
                  gradient={
                    FEATURED_GRADIENTS[index % FEATURED_GRADIENTS.length]
                  }
                  currency={currency}
                />
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
