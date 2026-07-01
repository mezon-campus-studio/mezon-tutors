import Link from "next/link";
import { FileText, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES, SUPPORT_EMAIL } from "@mezon-tutors/shared";
import { LegalRichText } from "./LegalRichText";

type LegalPageKey =
  | "TermsOfService"
  | "PrivacyPolicy"
  | "RefundPolicy"
  | "TutorPolicy";

type LegalSectionGroup = {
  label: string;
  items: string[];
};

type LegalSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  groups?: LegalSectionGroup[];
};

const RELATED_LINKS: Array<{
  key: LegalPageKey;
  href: string;
  labelKey: "termsOfService" | "privacyPolicy" | "refundPolicy" | "tutorPolicy";
}> = [
  {
    key: "TermsOfService",
    href: ROUTES.SUPPORT.TERMS_OF_SERVICE,
    labelKey: "termsOfService",
  },
  {
    key: "PrivacyPolicy",
    href: ROUTES.SUPPORT.PRIVACY_POLICY,
    labelKey: "privacyPolicy",
  },
  {
    key: "RefundPolicy",
    href: ROUTES.SUPPORT.REFUND_POLICY,
    labelKey: "refundPolicy",
  },
  {
    key: "TutorPolicy",
    href: ROUTES.SUPPORT.TUTOR_POLICY,
    labelKey: "tutorPolicy",
  },
];

type SupportLegalPageProps = {
  pageKey: LegalPageKey;
};

export default async function SupportLegalPage({ pageKey }: SupportLegalPageProps) {
  const t = await getTranslations(`Legal.${pageKey}`);
  const tRelated = await getTranslations("Legal.relatedLinks");
  const sections = t.raw("sections") as LegalSection[];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#f5f3ff_70%,#fdf2f8_100%)]" />
        <div className="absolute -top-32 left-1/4 size-[28rem] rounded-full bg-violet-300/20 blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 size-[24rem] rounded-full bg-fuchsia-300/15 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-4xl px-5 pt-10 pb-20 sm:pt-14 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200/70 bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/50">
            <FileText className="size-3.5" />
            {t("badge")}
          </p>

          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            {t("title")}
          </h1>

          <p className="mt-3 text-sm text-slate-500">{t("lastUpdated")}</p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            <LegalRichText text={t("intro")} />
          </p>
        </div>

        <article className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-sm shadow-violet-100/40 backdrop-blur sm:p-10">
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="scroll-mt-28">
                <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                  {section.title}
                </h2>

                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-3 text-sm leading-7 text-slate-600 sm:text-base"
                  >
                    <LegalRichText text={paragraph} />
                  </p>
                ))}

                {section.groups?.map((group) => (
                  <div
                    key={group.label}
                    className="mt-4 overflow-hidden rounded-2xl border border-violet-100/90 bg-gradient-to-br from-violet-50/60 to-white p-4 sm:mt-5 sm:p-5"
                  >
                    <h3 className="text-sm font-extrabold tracking-tight text-violet-900 sm:text-base">
                      {group.label}
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2.5 text-sm leading-7 text-slate-600 sm:text-base"
                        >
                          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-gradient-135" />
                          <LegalRichText text={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {section.list?.length ? (
                  <ul className="mt-3 space-y-2">
                    {section.list.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2.5 text-sm leading-7 text-slate-600 sm:text-base"
                      >
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-gradient-135" />
                        <LegalRichText text={item} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-violet-100 bg-violet-50/50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40">
                <Mail className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t("contactLabel")}</p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-1 inline-block text-sm font-medium text-violet-700 transition-colors hover:text-violet-900"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </article>

        <aside className="mt-8 rounded-3xl border border-violet-100 bg-white/80 p-5 shadow-sm shadow-violet-100/30 sm:p-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">
            {t("relatedTitle")}
          </h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {RELATED_LINKS.filter((link) => link.key !== pageKey).map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              >
                {tRelated(link.labelKey)}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
