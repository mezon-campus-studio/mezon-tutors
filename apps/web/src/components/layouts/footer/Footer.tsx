"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ROUTES, SUPPORT_EMAIL } from "@mezon-tutors/shared";
import { usePublicAppSettings } from "@/services";
import { Separator } from "@/components/ui";
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

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M23.498 6.186a2.99 2.99 0 0 0-2.104-2.117C19.537 3.5 12 3.5 12 3.5s-7.537 0-9.394.569A2.99 2.99 0 0 0 .502 6.186C0 8.057 0 12 0 12s0 3.943.502 5.814a2.99 2.99 0 0 0 2.104 2.117C4.463 20.5 12 20.5 12 20.5s7.537 0 9.394-.569a2.99 2.99 0 0 0 2.104-2.117C24 15.943 24 12 24 12s0-3.943-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

function TiktokIcon({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-1.885V13.39a5.324 5.324 0 1 1-5.324-5.324c.181 0 .36.01.536.027v2.621a2.704 2.704 0 1 0 2.167 2.649V0h2.621a4.798 4.798 0 0 0 4.77 4.77v1.916Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.472l8.6-9.83L0 1.153h7.594l5.243 6.932 6.064-6.932Zm-1.29 19.494h2.04L6.486 3.24H4.298l13.313 17.407Z" />
    </svg>
  );
}

function buildSocialsFromLinks(links: Record<string, string> | undefined | null) {
  if (!links) return [] as { href: string; label: string; icon: any }[];
  const socials: { href: string; label: string; icon: any }[] = [];
  if (links.facebook) socials.push({ href: links.facebook, label: 'Facebook', icon: FacebookIcon });
  if (links.instagram) socials.push({ href: links.instagram, label: 'Instagram', icon: InstagramIcon });
  if (links.linkedin) socials.push({ href: links.linkedin, label: 'LinkedIn', icon: LinkedinIcon });
  if (links.youtube) socials.push({ href: links.youtube, label: 'YouTube', icon: YoutubeIcon });
  if (links.tiktok) socials.push({ href: links.tiktok, label: 'TikTok', icon: TiktokIcon });
  if (links.twitter) socials.push({ href: links.twitter, label: 'Twitter', icon: XIcon });
  return socials;
}

export default function Footer() {
  const t = useTranslations("Common.Footer");
  const pathname = usePathname();
  const { data: publicSettings } = usePublicAppSettings();
  const socials = buildSocialsFromLinks(publicSettings?.socialLinks as Record<string, string> | undefined | null);

  const HIDDEN_PREFIXES = [
    "/dashboard",
    "/practice",
    "/become-tutor",
    "/checkout",
    "/admin",
  ];
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
      ],
    },
    {
      key: "community",
      title: t("community.title"),
      links: [
        { label: t("community.becomeTutor"), href: "/become-tutor" },
        { label: t("community.blog"), href: ROUTES.BLOGS.INDEX },
        { label: t("community.events"), href: ROUTES.HOME.events, sectionId: "events" },
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
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex size-10 items-center justify-center rounded-full border border-violet-100 bg-white text-slate-500 shadow-sm shadow-violet-100/40 transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] hover:text-violet-700 hover:shadow-md hover:shadow-violet-200/40"
                  >
                    <Icon className="size-4" />
                  </a>
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
                      onClick={(e) => {
                        if (
                          "sectionId" in link &&
                          link.sectionId &&
                          pathname === ROUTES.HOME.index
                        ) {
                          e.preventDefault();
                          document
                            .getElementById(link.sectionId)
                            ?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
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

        <Separator className="mt-10 bg-violet-100" />

        <div className="mt-6 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs text-slate-500">{t("copyright")}</p>
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
