"use client";

import { ESubject, ROUTES } from "@mezon-tutors/shared";
import { ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

const POPULAR_SUBJECTS = [
  ESubject.ENGLISH,
  ESubject.MATH,
  ESubject.JAPANESE,
  ESubject.KOREAN,
] as const;

export default function HomeHeroSection() {
  const t = useTranslations("Home.Hero");
  const tSubject = useTranslations("Tutors.Filter.Subject");

  return (
    <section className="relative isolate overflow-hidden bg-slate-900 py-10 text-white sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <Image
          src="/images/home-learning-call.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center] md:object-center"
        />
        <div className="absolute inset-0 bg-slate-950/75 md:bg-transparent md:bg-[linear-gradient(90deg,rgba(15,23,42,0.85)_0%,rgba(15,23,42,0.68)_42%,rgba(15,23,42,0.1)_78%)]" />
      </div>
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-8">
        <p className="mb-4 text-sm font-medium text-brand-200">{t("badge")}</p>
        <h1 className="max-w-xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl sm:leading-[1.25]">
          {t("title")}
          <span className="mt-1 block text-brand-200">
            {t("titleHighlightTail")}
          </span>
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-slate-200">
          {t("description")}
        </p>

        <form
          action={ROUTES.TUTOR.INDEX}
          method="get"
          role="search"
          className="mt-6 flex max-w-xl flex-col gap-2 rounded-xl border border-white/30 bg-white p-1.5 text-left focus-within:ring-2 focus-within:ring-brand-300 sm:flex-row"
        >
          <label htmlFor="home-subject" className="sr-only">
            {t("search.label")}
          </label>
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 size-5 text-slate-400"
            />
            <select
              id="home-subject"
              name="subject"
              defaultValue=""
              className="h-12 w-full cursor-pointer appearance-none rounded-lg bg-transparent pr-10 pl-11 text-base text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">{t("search.placeholder")}</option>
              {Object.values(ESubject)
                .filter((subject) => subject !== ESubject.ANY_SUBJECT)
                .map((subject) => (
                  <option key={subject} value={subject}>
                    {tSubject(subject)}
                  </option>
                ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 size-4 text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="h-12 shrink-0 cursor-pointer rounded-lg bg-brand-700 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            {t("search.submit")}
          </button>
        </form>

        <div className="mt-4 flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-slate-300">{t("popular")}</span>
          {POPULAR_SUBJECTS.map((subject) => (
            <Link
              key={subject}
              href={`${ROUTES.TUTOR.INDEX}?subject=${subject}`}
              className="text-slate-200 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white"
            >
              {tSubject(subject)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
