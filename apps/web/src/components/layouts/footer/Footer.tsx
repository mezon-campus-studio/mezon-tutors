"use client";

import { ArrowRight, Globe, Mail, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ROUTES, SUPPORT_EMAIL } from "@mezon-tutors/shared";
import { Button, Input, Separator } from "@/components/ui";
import MezonlyLogo from "@/public/images/Mezonly-logo.png";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

const SOCIALS = [
  { href: "https://example.com", label: "Facebook", icon: FacebookIcon },
  { href: "https://example.com", label: "Instagram", icon: InstagramIcon },
  { href: "https://example.com", label: "LinkedIn", icon: LinkedinIcon },
];

export default function Footer() {
  const t = useTranslations("Common.Footer");
  const pathname = usePathname();

  const HIDDEN_PREFIXES = ["/dashboard", "/become-tutor", "/checkout", "/admin"];
  const shouldHide = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );

  if (shouldHide) {
    return null;
  }

  const footerColumns = [
    {
      key: "product",
      title: t("product.title"),
      links: [
        { label: t("product.findTutor"), href: "/tutors" },
        { label: t("product.pricing"), href: "/checkout/trial-lesson" },
        { label: t("product.enterprise"), href: "/" },
      ],
    },
    {
      key: "community",
      title: t("community.title"),
      links: [
        { label: t("community.blog"), href: "/" },
        { label: t("community.becomeTutor"), href: "/become-tutor" },
        { label: t("community.events"), href: "/" },
      ],
    },
    {
      key: "support",
      title: t("support.title"),
      links: [
        { label: t("support.onboarding"), href: ROUTES.SUPPORT.ONBOARDING },
        { label: t("support.legalCenter"), href: ROUTES.SUPPORT.LEGAL_CENTER },
        { label: t("support.contact"), href: `mailto:${SUPPORT_EMAIL}` },
      ],
    },
  ];

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-violet-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#f5f3ff_70%,#fdf2f8_100%)]" />
        <div className="absolute -top-32 left-1/4 size-[28rem] rounded-full bg-violet-300/20 blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 size-[24rem] rounded-full bg-fuchsia-300/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(108 92 231) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 pt-16 pb-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
            >
              <Image
                src={MezonlyLogo}
                alt="Mezonly"
                width={48}
                height={48}
                className="drop-shadow-[0_6px_16px_rgba(124,58,237,0.28)]"
              />
              <div className="flex flex-col leading-none">
                <span className="bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
                  Mezonly
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t("tagline")}
                </span>
              </div>
            </Link>

            <p className="max-w-md text-sm leading-6 text-slate-600">
              {t("description")}
            </p>

            <div className="flex items-center gap-2">
              {SOCIALS.map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="group flex size-10 items-center justify-center rounded-full border border-violet-100 bg-white text-slate-500 shadow-sm shadow-violet-100/40 transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] hover:text-violet-700 hover:shadow-md hover:shadow-violet-200/40"
                  >
                    <Icon className="size-4" />
                  </Link>
                );
              })}
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.key} className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.key}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-violet-700"
                    >
                      <span className="size-1 rounded-full bg-slate-300 transition-all group-hover:size-1.5 group-hover:bg-[linear-gradient(135deg,#7c3aed,#ec4899)]" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-violet-100 bg-white p-6 shadow-sm shadow-violet-100/40 sm:p-8">
          <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
                <Mail className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                  Newsletter
                </p>
                <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
                  {t("newsletter.title")}
                </h3>
                <p className="max-w-md text-xs text-slate-600 sm:text-sm">
                  {t("newsletter.description")}
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:min-w-[400px]"
            >
              <Input
                type="email"
                placeholder={t("newsletter.placeholder")}
                className="h-11 flex-1 rounded-full border-slate-200 bg-slate-50/60 px-4 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              <Button
                type="submit"
                className="group h-11 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
              >
                <Sparkles className="mr-1.5 size-4" />
                {t("newsletter.submit")}
                <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>
          </div>
        </div>

        <Separator className="mt-10 bg-violet-100" />

        <div className="mt-6 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs text-slate-500">{t("copyright")}</p>
            <span className="hidden size-1 rounded-full bg-slate-300 sm:block" />
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Globe className="size-3 text-violet-500" />
              {t("madeWith")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <Link
              href={ROUTES.SUPPORT.TERMS_OF_SERVICE}
              className="font-medium text-slate-500 transition-colors hover:text-violet-700"
            >
              {t("bottom.terms")}
            </Link>
            <Link
              href={ROUTES.SUPPORT.PRIVACY_POLICY}
              className="font-medium text-slate-500 transition-colors hover:text-violet-700"
            >
              {t("bottom.privacy")}
            </Link>
            <Link
              href={ROUTES.SUPPORT.REFUND_POLICY}
              className="font-medium text-slate-500 transition-colors hover:text-violet-700"
            >
              {t("bottom.refund")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
