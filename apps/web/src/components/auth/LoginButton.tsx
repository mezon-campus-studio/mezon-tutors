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
import {
  MEZONLY_OAUTH_ACTION_KEY,
  MEZON_OAUTH_RESULT_CHANNEL,
} from "@mezon-tutors/shared";
import { Button } from "../ui";

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
          const authUser = toAuthUser({ ...loginUser, idToken });
          setUser(authUser);
        } else {
          void authService
            .getMe()
            .then((data) => {
              const authUser = toAuthUser({ ...data, idToken });
              setUser(authUser);
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
    [cleanup, setUser, setAccessToken],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      processOAuthPayload(event.data as MezonAuthMessage);
    };

    window.addEventListener("message", handleMessage);

    try {
      const channel = new BroadcastChannel(MEZON_OAUTH_RESULT_CHANNEL);
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
      setAccessToken(null);
      setUser(null);

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
      localStorage.setItem(MEZONLY_OAUTH_ACTION_KEY, "login");
      const url = await authService.getAuthUrl();
      popup.location.href = url;

      intervalRef.current = window.setInterval(() => {
        if (!popup || popup.closed) cleanup();
      }, 5000);
    } catch {
      cleanup();
    }
  }, [cleanup, setAccessToken, setUser]);

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <Button
      type="button"
      className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] px-6 text-sm font-semibold tracking-wide text-white shadow-md shadow-violet-300/40 transition-all duration-300 hover:shadow-lg hover:shadow-violet-400/50 active:scale-[0.97]"
      onClick={() => {
        void handleLoginClick();
      }}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <span className="relative">{label}</span>
    </Button>
  );
}
