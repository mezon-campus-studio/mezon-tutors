"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { authService } from "@/services";
import {
  MEZONLY_OAUTH_ACTION_KEY,
  MEZON_SYNC_RESULT_CHANNEL,
} from "@mezon-tutors/shared";
import { toAuthUser, userAtom } from "@/store/auth.atom";
import { accessTokenAtom } from "@/store/token.atom";

type MezonSyncMessage =
  | {
      type: "MEZON_SYNC_SUCCESS";
      data?: {
        user?: {
          sub?: string;
          id?: string;
          mezonUserId?: string;
          username?: string;
          email?: string | null;
          avatar?: string | null;
          role?: string;
        };
        accessToken?: string;
        idToken?: string | null;
      };
    }
  | { type: "MEZON_SYNC_ERROR"; error?: string };

type MezonSyncButtonProps = {
  className?: string;
  onSuccessAction?: () => void;
};

export function MezonSyncButton({
  className,
  onSuccessAction,
}: MezonSyncButtonProps) {
  const t = useTranslations("Dashboard");
  const setUser = useSetAtom(userAtom);
  const setAccessToken = useSetAtom(accessTokenAtom);
  const [syncing, setSyncing] = useState(false);

  const popupRef = useRef<Window | null>(null);
  const intervalRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const finishedRef = useRef(false);

  const stopPopupWatch = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const closePopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
  }, []);

  const endSyncFlow = useCallback(() => {
    finishedRef.current = true;
    stopPopupWatch();
    closePopup();
    setSyncing(false);
  }, [closePopup, stopPopupWatch]);

  const processSyncPayload = useCallback(
    (payload: MezonSyncMessage) => {
      if (!payload) return;
      if (finishedRef.current) return;

      if (
        payload.type === "MEZON_SYNC_SUCCESS" &&
        payload.data?.user &&
        payload.data.accessToken
      ) {
        const u = payload.data.user;
        setAccessToken(payload.data.accessToken);
        setUser(
          toAuthUser({
            ...u,
            idToken: payload.data.idToken ?? null,
          }),
        );
        toast.success(t("sidebar.syncMezon.successTitle"), {
          description: t("sidebar.syncMezon.successDescription"),
        });
        onSuccessAction?.();
        endSyncFlow();
        return;
      }

      if (payload.type === "MEZON_SYNC_ERROR") {
        toast.error(t("sidebar.syncMezon.errorTitle"), {
          description: payload.error ?? t("sidebar.syncMezon.errorDescription"),
        });
        endSyncFlow();
      }
    },
    [endSyncFlow, onSuccessAction, setAccessToken, setUser, t],
  );

  useEffect(() => {
    const onWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as MezonSyncMessage | undefined;
      if (!data || typeof data !== "object" || !("type" in data)) return;
      if (data.type !== "MEZON_SYNC_SUCCESS" && data.type !== "MEZON_SYNC_ERROR") return;
      processSyncPayload(data);
    };

    window.addEventListener("message", onWindowMessage);

    try {
      const channel = new BroadcastChannel(MEZON_SYNC_RESULT_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        processSyncPayload(event.data as MezonSyncMessage);
      };
      channelRef.current = channel;
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("message", onWindowMessage);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      stopPopupWatch();
      closePopup();
    };
  }, [closePopup, processSyncPayload, stopPopupWatch]);

  const handleSync = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      const width = 800;
      const height = 500;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        "about:blank",
        "mezon-oauth-sync",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
      );

      if (!popup) {
        toast.error(t("sidebar.syncMezon.errorTitle"), {
          description: t("sidebar.syncMezon.popupBlocked"),
        });
        return;
      }

      finishedRef.current = false;
      popupRef.current = popup;
      setSyncing(true);
      localStorage.setItem(MEZONLY_OAUTH_ACTION_KEY, "sync");
      const url = await authService.getAuthUrl();
      popup.location.href = url;

      stopPopupWatch();
      intervalRef.current = window.setInterval(() => {
        if (finishedRef.current) {
          stopPopupWatch();
          return;
        }
        if (popup.closed) {
          stopPopupWatch();
          setSyncing(false);
          popupRef.current = null;
        }
      }, 500);
    } catch {
      toast.error(t("sidebar.syncMezon.errorTitle"), {
        description: t("sidebar.syncMezon.errorDescription"),
      });
      endSyncFlow();
    }
  }, [endSyncFlow, stopPopupWatch, t]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-9 w-full rounded-xl border-violet-200 bg-white text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50 ${className ?? ""}`}
      disabled={syncing}
      onClick={() => void handleSync()}
    >
      <RefreshCw className={`mr-1.5 size-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? t("sidebar.syncMezon.syncing") : t("sidebar.syncMezon.label")}
    </Button>
  );
}
