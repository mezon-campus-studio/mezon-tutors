"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { authService } from "@/services";
import {
  isAuthenticatedAtom,
  isLoadingAtom,
  toAuthUser,
  userAtom,
} from "@/store/auth.atom";
import { accessTokenAtom } from "@/store/token.atom";
import { Button } from "@/components/ui";

const OAUTH_CHANNEL = "mezon-oauth-result";

type MezonAuthMessage =
  | {
      type: "MEZON_AUTH_SUCCESS";
      data?: {
        user?: {
          id?: string;
          mezonUserId?: string;
          username?: string;
          email?: string | null;
          avatar?: string | null;
          idToken?: string | null;
        };
        accessToken?: string;
        idToken?: string | null;
      };
    }
  | {
      type: "MEZON_AUTH_ERROR";
      error?: string;
    };

type LoginButtonProps = {
  label: string;
};

export function LoginButton({ label }: LoginButtonProps) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const setUser = useSetAtom(userAtom);
  const setAccessToken = useSetAtom(accessTokenAtom);

  const popupRef = useRef<Window | null>(null);
  const intervalRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }

    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
  }, []);

  const processOAuthPayload = useCallback(
    (payload: MezonAuthMessage) => {
      if (!payload) return;

      if (payload.type === "MEZON_AUTH_SUCCESS") {
        const accessToken = payload.data?.accessToken;
        const loginUser = payload.data?.user;
        const idToken = payload.data?.idToken;

        if (!accessToken) return;

        setAccessToken(accessToken);
        if (loginUser?.mezonUserId) {
          setUser(toAuthUser({ ...loginUser, idToken }));
        } else {
          void authService
            .getMe()
            .then((data) => {
              setUser(toAuthUser({ ...data, idToken }));
            })
            .catch(() => {
              setAccessToken(null);
              setUser(null);
            });
        }
        cleanup();
        return;
      }

      if (payload.type === "MEZON_AUTH_ERROR") {
        cleanup();
      }
    },
    [cleanup, setUser],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      processOAuthPayload(event.data as MezonAuthMessage);
    };

    window.addEventListener("message", handleMessage);

    try {
      const channel = new BroadcastChannel(OAUTH_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        processOAuthPayload(event.data as MezonAuthMessage);
      };
      channelRef.current = channel;
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      cleanup();
    };
  }, [processOAuthPayload, cleanup]);

  const handleLoginClick = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      const width = 800;
      const height = 500;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        "about:blank",
        "mezon-oauth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
      );

      if (!popup) {
        cleanup();
        return;
      }

      popupRef.current = popup;
      const url = await authService.getAuthUrl();
      popup.location.href = url;

      intervalRef.current = window.setInterval(() => {
        if (!popup || popup.closed) cleanup();
      }, 5000);
    } catch {
      cleanup();
    }
  }, [cleanup]);

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <Button
      type="button"
      className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      onClick={() => {
        void handleLoginClick();
      }}
    >
      {label}
    </Button>
  );
}
