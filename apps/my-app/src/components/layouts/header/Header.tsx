"use client";

import { useAtomValue, useSetAtom } from "jotai";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { HeaderNotification } from "@/components/common/header-notification/HeaderNotification";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useCurrency } from "@/hooks";
import MezonlyLogo from "@/public/images/Mezonly-logo.png";
import { initAuthAtom, isAuthenticatedAtom, userAtom } from "@/store/auth.atom";

export default function Header() {
  const t = useTranslations("Common.Header");
  const locale = useLocale();
  const router = useRouter();
  const initAuth = useSetAtom(initAuthAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const [mounted, setMounted] = useState(false);
  const { currency, setCurrency, currencyOptions } = useCurrency();
  const nextLocale = locale === "en" ? "vi" : "en";
  const navItems = [
    { label: t("findTutors"), href: "/tutors" },
    { label: t("becomeTutor"), href: "/become-tutor" },
    { label: t("myLessons"), href: "/checkout/trial-lesson" },
  ];

  const userInitials =
    user?.username
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "U";

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocaleToggle = () => {
    const isHttps = window.location.protocol === "https:";
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax${isHttps ? "; secure" : ""}`;
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src={MezonlyLogo} alt="Mezonly" width={32} height={32} />
          <span className="text-lg font-extrabold text-slate-900">Mezonly</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-md font-medium text-slate-600 transition hover:text-violet-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {mounted ? (
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value as typeof currency)}
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleLocaleToggle}
          >
            {locale.toUpperCase()}
          </Button>
          {mounted && isAuthenticated ? (
            <HeaderNotification enabled={isAuthenticated} />
          ) : null}
          {mounted ? <LoginButton label={t("login")} /> : null}
          {mounted && isAuthenticated && (
            <Avatar className="size-8 border border-violet-200">
              {user?.avatar ? (
                <AvatarImage
                  src={user.avatar}
                  alt={user?.username ?? "User avatar"}
                />
              ) : null}
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </header>
  );
}
