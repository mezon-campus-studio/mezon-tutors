import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GraduationCap,
  RefreshCw,
  Scale,
  Shield,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@mezon-tutors/shared";

type LegalDocumentId =
  | "termsOfService"
  | "privacyPolicy"
  | "refundPolicy"
  | "tutorPolicy";

type LegalDocumentItem = {
  id: LegalDocumentId;
  title: string;
  description: string;
  updated: string;
};

const DOCUMENT_ROUTES: Record<LegalDocumentId, string> = {
  termsOfService: ROUTES.SUPPORT.TERMS_OF_SERVICE,
  privacyPolicy: ROUTES.SUPPORT.PRIVACY_POLICY,
  refundPolicy: ROUTES.SUPPORT.REFUND_POLICY,
  tutorPolicy: ROUTES.SUPPORT.TUTOR_POLICY,
};

const DOCUMENT_ICONS: Record<LegalDocumentId, ComponentType<{ className?: string }>> = {
  termsOfService: Scale,
  privacyPolicy: Shield,
  refundPolicy: RefreshCw,
  tutorPolicy: GraduationCap,
};

export default async function SupportLegalCenterPage() {
  const t = await getTranslations("Legal.LegalCenter");
  const documents = t.raw("documents") as LegalDocumentItem[];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#f5f3ff_70%,#fdf2f8_100%)]" />
        <div className="absolute -top-32 left-1/4 size-[28rem] rounded-full bg-violet-300/20 blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 size-[24rem] rounded-full bg-fuchsia-300/15 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-4xl px-5 pt-10 pb-20 sm:pt-14 lg:px-8">
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200/70 bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/50">
            <FileText className="size-3.5" />
            {t("badge")}
          </p>

          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            {t("title")}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            {t("intro")}
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5">
          {documents.map((document) => {
            const Icon = DOCUMENT_ICONS[document.id];
            const href = DOCUMENT_ROUTES[document.id];

            return (
              <Link
                key={document.id}
                href={href}
                className="group overflow-hidden rounded-[1.75rem] border border-violet-100 bg-white/85 p-5 shadow-sm shadow-violet-100/40 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-200/40 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40 transition-transform group-hover:scale-105">
                    <Icon className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                        {document.title}
                      </h2>
                      <span className="shrink-0 text-xs text-slate-500">
                        {document.updated}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
                      {document.description}
                    </p>

                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 transition-colors group-hover:text-violet-900">
                      {t("readMore")}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
