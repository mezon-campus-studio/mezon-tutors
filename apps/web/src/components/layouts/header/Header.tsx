"use client";

import { HEADER_LOCALES, ROUTES } from "@mezon-tutors/shared";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Check, ChevronDown, Globe, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { HeaderNotification } from "@/components/common/header-notification/HeaderNotification";
import DashboardMobileDrawer from "@/components/dashboard/DashboardMobileDrawer";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { useCurrency } from "@/hooks";
import MezonlyLogo from "@/public/images/Mezonly-logo.png";
import { authService } from "@/services";
import {
  dashboardMobileDrawerAtom,
  initAuthAtom,
  isAuthenticatedAtom,
  userAtom,
} from "@/store";

export default function Header() {
  const t = useTranslations("Common.Header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const initAuth = useSetAtom(initAuthAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const [isMobileDrawerOpen, setDashboardMobileDrawer] = useAtom(
    dashboardMobileDrawerAtom,
  );
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { currency, setCurrency, currencyOptions } = useCurrency();
  const navItems = [
    { label: t("findTutors"), href: "/tutors", requiresAuth: false },
    { label: t("becomeTutor"), href: "/become-tutor", requiresAuth: false },
    {
      label: t("myLessons"),
      href: "/checkout/trial-lesson",
      requiresAuth: true,
    },
  ].filter((item) => !item.requiresAuth || (mounted && isAuthenticated));

  const userInitials =
    user?.username
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "U";

  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  
  

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    const isHttps = window.location.protocol === "https:";
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; samesite=lax${isHttps ? "; secure" : ""}`;
    router.refresh();
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const handleAvatarClick = useCallback(() => {
    if (!user?.role) return;

    if (user.role === "STUDENT") {
      router.push(ROUTES.DASHBOARD.MY_LESSONS);
    } else if (user.role === "TUTOR") {
      router.push(ROUTES.DASHBOARD.TRIAL_BOOKING);
    } else if (user.role === 'ADMIN') {
      router.push(ROUTES.ADMIN.TUTOR_APPLICATIONS);
    }
  }, [user?.role, router]);

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-slate-200/70 bg-white/85 shadow-sm shadow-violet-100/40 backdrop-blur-xl"
            : "border-b border-slate-100/60 bg-white/70 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 size-10 rounded-full hover:bg-violet-50"
              onClick={() => setDashboardMobileDrawer(true)}
            >
              <Menu className="size-6" />
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={MezonlyLogo}
                alt="Mezonly"
                width={38}
                height={38}
                className="drop-shadow-[0_4px_12px_rgba(124,58,237,0.25)]"
              />
              <span className="bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                Mezonly
              </span>
            </Link>
          </div>

          <Link
            href="/"
            className="group hidden items-center gap-2.5 transition-transform hover:scale-[1.02] md:inline-flex"
          >
            <div className="relative">
              <Image
                src={MezonlyLogo}
                alt="Mezonly"
                width={48}
                height={48}
                priority
                className="drop-shadow-[0_6px_16px_rgba(124,58,237,0.28)] transition-transform duration-300 group-hover:rotate-[-6deg]"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
                Mezonly
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Tutor Matching
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "text-violet-700"
                      : "text-slate-600 hover:text-violet-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none absolute inset-0 -z-10 rounded-full bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] ring-1 ring-inset transition-all duration-300 ${
                      isActive
                        ? "scale-100 opacity-100 ring-violet-100"
                        : "scale-90 opacity-0 ring-transparent group-hover:scale-100 group-hover:opacity-100 group-hover:ring-violet-100"
                    }`}
                  />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {mounted ? (
              <>
                <div className="md:hidden">
                  <MobileRegionPopover
                    locale={locale}
                    currency={currency}
                    currencyOptions={currencyOptions}
                    onLocaleChange={handleLocaleChange}
                    onCurrencyChange={(value) =>
                      setCurrency(value as typeof currency)
                    }
                  />
                </div>

                <div className="hidden items-center gap-1.5 md:flex">
                  <CurrencyPopover
                    currency={currency}
                    options={currencyOptions}
                    onChange={(value) => setCurrency(value as typeof currency)}
                  />
                  <LocalePopover
                    locale={locale}
                    onChange={handleLocaleChange}
                  />
                </div>
              </>
            ) : null}
            {mounted && isAuthenticated ? (
              <HeaderNotification enabled={isAuthenticated} />
            ) : null}
            {mounted ? <LoginButton label={t("login")} /> : null}
            {mounted && isAuthenticated && (
              <Avatar
                className="size-9 cursor-pointer border-2 border-violet-200 ring-2 ring-violet-100 transition-all hover:border-violet-400 hover:ring-violet-200"
                onClick={handleAvatarClick}
              >
                {user?.avatar ? (
                  <AvatarImage
                    src={user.avatar}
                    alt={user?.username ?? "User avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white" onClick={handleAvatarClick}>
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </header>
      <DashboardMobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setDashboardMobileDrawer(false)} 
        userRole={user?.role}
        pathname={pathname}
        onLogout={handleLogout}
      />
    </>
  );
}

const CURRENCY_INFO: Record<
  string,
  { symbol: string; name: string; flag: string }
> = {
  VND: { symbol: "₫", name: "Vietnamese Dong", flag: "🇻🇳" },
  USD: { symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  PHP: { symbol: "₱", name: "Philippine Peso", flag: "🇵🇭" },
};

const LOCALE_INFO: Record<
  string,
  { flag: string; name: string; native: string }
> = {
  en: { flag: "🇬🇧", name: "English", native: "English" },
  vi: { flag: "🇻🇳", name: "Vietnamese", native: "Tiếng Việt" },
};

function CurrencyPopover({
  currency,
  options,
  onChange,
}: {
  currency: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const info = CURRENCY_INFO[currency];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label="Select currency"
            className="group h-9 gap-1.5 rounded-full border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 backdrop-blur transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 aria-expanded:border-violet-300 aria-expanded:bg-violet-50 aria-expanded:text-violet-700"
          >
            <span className="flex size-5 items-center justify-center rounded-md bg-violet-100 text-[11px] font-bold text-violet-700 group-hover:bg-violet-200/80 group-aria-expanded:bg-violet-200/80">
              {info?.symbol ?? "$"}
            </span>
            {currency}
            <ChevronDown className="size-3.5 text-slate-400 transition-transform group-aria-expanded:rotate-180" />
          </Button>
        }
      />
      <PopoverContent
        className="w-64 rounded-2xl border-slate-100 p-1.5 shadow-xl shadow-violet-100/40"
        align="end"
        sideOffset={8}
      >
        <div className="px-3 pt-2 pb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Currency
          </p>
        </div>
        {options.map((option) => {
          const opt = CURRENCY_INFO[option];
          const isActive = currency === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all ${
                isActive
                  ? "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${
                  isActive
                    ? "bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-sm shadow-violet-300/40"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {opt?.symbol ?? "$"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {option}
                  </p>
                  <span className="text-xs">{opt?.flag}</span>
                </div>
                <p className="truncate text-[11px] text-slate-500">
                  {opt?.name ?? option}
                </p>
              </div>
              {isActive ? (
                <div className="flex size-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white">
                  <Check className="size-3" strokeWidth={3} />
                </div>
              ) : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function LocalePopover({
  locale,
  onChange,
}: {
  locale: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const info = LOCALE_INFO[locale];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label="Select language"
            className="group h-9 gap-1.5 rounded-full border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 backdrop-blur transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 aria-expanded:border-violet-300 aria-expanded:bg-violet-50 aria-expanded:text-violet-700"
          >
            <Globe className="size-3.5 text-violet-500" />
            {locale.toUpperCase()}
            <ChevronDown className="size-3.5 text-slate-400 transition-transform group-aria-expanded:rotate-180" />
          </Button>
        }
      />
      <PopoverContent
        className="w-64 rounded-2xl border-slate-100 p-1.5 shadow-xl shadow-violet-100/40"
        align="end"
        sideOffset={8}
      >
        <div className="px-3 pt-2 pb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Language · {info?.native}
          </p>
        </div>
        {HEADER_LOCALES.map((loc) => {
          const opt = LOCALE_INFO[loc.code];
          const isActive = locale === loc.code;
          return (
            <button
              key={loc.code}
              type="button"
              onClick={() => {
                onChange(loc.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all ${
                isActive
                  ? "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xl ${
                  isActive
                    ? "bg-white shadow-sm ring-1 ring-violet-200"
                    : "bg-slate-100"
                }`}
              >
                {opt?.flag}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {opt?.native ?? loc.label}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {opt?.name ?? loc.code.toUpperCase()}
                </p>
              </div>
              {isActive ? (
                <div className="flex size-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white">
                  <Check className="size-3" strokeWidth={3} />
                </div>
              ) : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function MobileRegionPopover({
  locale,
  currency,
  currencyOptions,
  onLocaleChange,
  onCurrencyChange,
}: {
  locale: string;
  currency: string;
  currencyOptions: readonly string[];
  onLocaleChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const localeInfo = LOCALE_INFO[locale];
  const currencyInfo = CURRENCY_INFO[currency];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label="Region settings"
            className="group h-9 gap-1.5 rounded-full border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 backdrop-blur"
          >
            <span className="text-base leading-none">{localeInfo?.flag}</span>
            {locale.toUpperCase()} · {currency}
            <ChevronDown className="size-3.5 text-slate-400 transition-transform group-aria-expanded:rotate-180" />
          </Button>
        }
      />
      <PopoverContent
        className="w-72 rounded-2xl border-slate-100 p-1.5 shadow-xl shadow-violet-100/40"
        align="end"
        sideOffset={8}
      >
        <div className="px-3 pt-2 pb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Language
          </p>
        </div>
        {HEADER_LOCALES.map((loc) => {
          const opt = LOCALE_INFO[loc.code];
          const isActive = locale === loc.code;
          return (
            <button
              key={loc.code}
              type="button"
              onClick={() => {
                onLocaleChange(loc.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all ${
                isActive
                  ? "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xl ${
                  isActive
                    ? "bg-white shadow-sm ring-1 ring-violet-200"
                    : "bg-slate-100"
                }`}
              >
                {opt?.flag}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {opt?.native ?? loc.label}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {opt?.name ?? loc.code.toUpperCase()}
                </p>
              </div>
              {isActive ? (
                <div className="flex size-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white">
                  <Check className="size-3" strokeWidth={3} />
                </div>
              ) : null}
            </button>
          );
        })}

        <div className="my-1 h-px bg-slate-100" />

        <div className="px-3 pt-2 pb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Currency · {currencyInfo?.name}
          </p>
        </div>
        {currencyOptions.map((option) => {
          const opt = CURRENCY_INFO[option];
          const isActive = currency === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onCurrencyChange(option);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all ${
                isActive
                  ? "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${
                  isActive
                    ? "bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-sm shadow-violet-300/40"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {opt?.symbol ?? "$"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {option}
                  </p>
                  <span className="text-xs">{opt?.flag}</span>
                </div>
                <p className="truncate text-[11px] text-slate-500">
                  {opt?.name ?? option}
                </p>
              </div>
              {isActive ? (
                <div className="flex size-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white">
                  <Check className="size-3" strokeWidth={3} />
                </div>
              ) : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
