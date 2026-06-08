"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authService } from "@/services";
import { isLoadingAtom, toAuthUser, userAtom } from "@/store/auth.atom";
import { accessTokenAtom } from "@/store/token.atom";

export default function HomeOAuthSuccessHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const setAccessToken = useSetAtom(accessTokenAtom);
  const setUser = useSetAtom(userAtom);
  const setIsAuthLoading = useSetAtom(isLoadingAtom);
  const inFlightRef = useRef(false);
  const t = useTranslations("Dashboard");

  useEffect(() => {
    const oauthSuccess = searchParams?.get("oauth") === "success";
    const syncSuccess = searchParams?.get("sync") === "success";
    if (!oauthSuccess && !syncSuccess) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;

    async function completeReturn() {
      setAccessToken(null);

      try {
        const accessTokenFromUrl = searchParams?.get("accessToken")?.trim();
        const accessToken = accessTokenFromUrl
          ? accessTokenFromUrl
          : (await authService.refreshToken()).accessToken;

        setAccessToken(accessToken);
        const me = await authService.getMe();
        setUser(toAuthUser(me));

        if (syncSuccess) {
          toast.success(t("sidebar.syncMezon.successTitle"), {
            description: t("sidebar.syncMezon.successDescription"),
          });
        }

        router.replace(pathname || "/");
      } catch {
        setAccessToken(null);
        setUser(null);
        if (syncSuccess) {
          toast.error(t("sidebar.syncMezon.errorTitle"), {
            description: t("sidebar.syncMezon.errorDescription"),
          });
        }
        router.replace(pathname || "/");
      } finally {
        setIsAuthLoading(false);
        inFlightRef.current = false;
      }
    }

    void completeReturn();
  }, [pathname, router, searchParams, setAccessToken, setUser, t]);

  return null;
}
