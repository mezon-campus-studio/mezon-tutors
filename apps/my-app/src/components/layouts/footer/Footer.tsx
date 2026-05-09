"use client";

import { usePathname } from 'next/navigation';
import Link from "next/link";
import FooterLinkColumn from "./FooterLinkColumn";
import FooterSocialButton from "./FooterSocialButton";
import { Card, CardContent, Separator } from "@/components/ui";
import { useTranslations } from "next-intl";

const SOCIALS = [
  { href: "https://example.com", label: "FB" },
  { href: "https://example.com", label: "IG" },
  { href: "https://example.com", label: "IN" },
];

export default function Footer() {
  const t = useTranslations("Common.Footer");
  const pathname = usePathname();
  
  const isDashboard = pathname?.startsWith('/dashboard');
  
  if (isDashboard) {
    return null;
  }
  
  const footerColumns = [
    {
      title: t("product.title"),
      links: [
        { label: t("product.findTutor"), href: "/tutors" },
        { label: t("product.pricing"), href: "/checkout/trial-lesson" },
      ],
    },
    {
      title: t("community.title"),
      links: [
        { label: t("community.blog"), href: "/" },
        { label: t("community.becomeTutor"), href: "/become-tutor" },
      ],
    },
    {
      title: t("support.title"),
      links: [
        { label: t("support.helpCenter"), href: "/" },
        { label: t("support.contact"), href: "/" },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-violet-100 bg-violet-50">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-wrap justify-between gap-10">
          <Card className="max-w-sm border-violet-100 bg-white py-0">
            <CardContent className="space-y-4 p-5">
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">TM</span>
                <span className="text-xl font-extrabold text-slate-900">Mezonly</span>
              </Link>
              <p className="text-sm leading-6 text-slate-600">
                {t("description")}
              </p>
              <div className="flex items-center gap-2">
                {SOCIALS.map((social) => (
                  <FooterSocialButton key={social.label} href={social.href} label={social.label} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {footerColumns.map((column) => (
              <FooterLinkColumn key={column.title} title={column.title} links={column.links} />
            ))}
          </div>
        </div>

        <Separator className="mt-10 bg-violet-100" />
        <div className="mt-6 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright")}</p>
          <div className="flex items-center gap-5">
            <Link href="/" className="transition hover:text-violet-700">
              {t("bottom.terms")}
            </Link>
            <Link href="/" className="transition hover:text-violet-700">
              {t("bottom.privacy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
