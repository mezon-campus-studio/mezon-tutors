"use client";

import { HeaderNotification } from "@/components/common/header-notification/HeaderNotification";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { Menu, ChevronDown } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import MezonlyLogo from "@/public/images/Mezonly-logo.png";
import { LoginButton } from "@/components/auth/LoginButton";
import { initAuthAtom, isAuthenticatedAtom, userAtom, dashboardMobileDrawerAtom } from "@/store";
import { useCurrency } from "@/hooks";
import { ROUTES, HEADER_LOCALES } from "@mezon-tutors/shared";
import DashboardMobileDrawer from "@/components/dashboard/DashboardMobileDrawer";
import { authService } from "@/services";

export default function Header() {
  const t = useTranslations("Common.Header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const initAuth = useSetAtom(initAuthAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const [isMobileDrawerOpen, setDashboardMobileDrawer] = useAtom(dashboardMobileDrawerAtom);
  const [mounted, setMounted] = useState(false);
  const { currency, setCurrency, currencyOptions } = useCurrency();
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
    
    if (user.role === 'STUDENT') {
      router.push(ROUTES.DASHBOARD.MY_LESSONS);
    } else if (user.role === 'TUTOR') {
      router.push(ROUTES.DASHBOARD.BOOKING_REQUESTS);
    } else if (user.role === 'ADMIN') {
      router.push(ROUTES.DASHBOARD.INDEX);
    }
  }, [user?.role, router]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2"
            onClick={() => setDashboardMobileDrawer(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="text-lg font-extrabold text-primary">Mezonly</span>
        </div>

        <Link href="/" className="hidden md:inline-flex items-center gap-1">
          <Image src={MezonlyLogo} alt="Mezonly" width={32} height={32} />
          <span className="text-lg font-extrabold text-slate-900">Mezonly</span>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
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
            <>
              <div className="md:hidden">
                <Popover>
                  <PopoverTrigger 
                    render={
                      <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-medium gap-1 flex items-center">
                        {t(`locales.${locale}` as any)}, {currency}
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-56 p-4 rounded-xl shadow-lg border border-gray-100" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">{t('language')}</label>
                        <Select value={locale} onValueChange={(val) => val && handleLocaleChange(val)}>
                          <SelectTrigger className="w-full h-10 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HEADER_LOCALES.map((loc) => (
                              <SelectItem key={loc.code} value={loc.code}>
                                {t(`locales.${loc.code}` as any)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">{t('currency')}</label>
                        <Select value={currency} onValueChange={(value) => setCurrency(value as typeof currency)}>
                          <SelectTrigger className="w-full h-10 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencyOptions.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <Select
                  value={currency}
                  onValueChange={(value) => setCurrency(value as typeof currency)}
                >
                  <SelectTrigger className="h-8 w-20 md:w-24">
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
                <Button
                  variant="outline"
                  className="rounded-full h-8 w-12 md:w-auto"
                  onClick={() => handleLocaleChange(locale === 'en' ? 'vi' : 'en')}
                >
                  {locale.toUpperCase()}
                </Button>
              </div>
            </>
          ) : null}
          {mounted && isAuthenticated ? (
            <HeaderNotification enabled={isAuthenticated} />
          ) : null}
          {mounted ? <LoginButton label={t("login")} /> : null}
          {mounted && isAuthenticated && (
            <Avatar 
              className="size-8 border border-violet-200 cursor-pointer hover:border-violet-400 transition-colors"
              onClick={handleAvatarClick}
            >
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
