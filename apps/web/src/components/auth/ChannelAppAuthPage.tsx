"use client";

import { ChannelAppAuthView } from "@/components/auth/ChannelAppAuthView";
import { getAuthDataFromURL } from "@/lib/mezon-channel-app";
import { authService } from "@/services";
import { ROUTES } from "@mezon-tutors/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChannelAppAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authData = getAuthDataFromURL(searchParams);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authData) {
      return;
    }

    let cancelled = false;

    void authService
      .loginWithChannelAppHash(authData)
      .then(() => {
        if (!cancelled) {
          router.replace(ROUTES.HOME.index);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authData, router]);

  if (!authData) {
    return <ChannelAppAuthView variant="missing-data" />;
  }

  if (error) {
    return <ChannelAppAuthView variant="error" message={error} />;
  }

  return <ChannelAppAuthView variant="loading" />;
}
