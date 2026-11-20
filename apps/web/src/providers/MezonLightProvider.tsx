"use client";

import { isLoadingAtom, userAtom } from "@/store/auth.atom";
import {
  authenticateMezonLightClient,
  clearMezonLightSessionStorage,
  getMezonGatewayUrl,
  restoreMezonLightClientFromStorage,
} from "@/services/mezon-light/mezon-light.client";
import { releaseMezonLightSocket } from "@/services/mezon-light/mezon-light.service";
import { MEZON_LIGHT_SERVER_KEY } from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { LightClient } from "mezon-light-sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MEZON_LIGHT_SESSION_STORAGE_KEY, storage } from "@/services";
import { MezonLightSocketListener } from "./MezonLightSocketListener";
import {
  canCommitMezonLightInitialization,
  restoreOrAuthenticateMezonLightClient,
} from "./mezon-light-initialization";
import { isMezonSendMessageError } from "@/lib/mezon-send-message-errors";

type MezonLightContextValue = {
  lightClient: LightClient | null;
  setLightClient: (client: LightClient | null) => void;
  ensureLightClient: () => Promise<LightClient | null>;
};

const MezonLightContext = createContext<MezonLightContextValue>({
  lightClient: null,
  setLightClient: () => {},
  ensureLightClient: async () => null,
});

export function MezonLightProvider({ children }: { children: ReactNode }) {
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const [lightClient, setLightClientState] = useState<LightClient | null>(null);
  const lightClientRef = useRef<LightClient | null>(null);
  const initializationPromiseRef = useRef<Promise<LightClient | null> | null>(null);
  const currentMezonUserIdRef = useRef<string | null>(null);
  currentMezonUserIdRef.current = user?.mezonUserId ?? null;

  const setLightClient = useCallback((client: LightClient | null) => {
    lightClientRef.current = client;
    setLightClientState(client);
  }, []);

  const ensureLightClient = useCallback(async (): Promise<LightClient | null> => {
    if (lightClientRef.current) {
      if (lightClientRef.current.userId === currentMezonUserIdRef.current) {
        return lightClientRef.current;
      }
      setLightClient(null);
      releaseMezonLightSocket();
    }
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }
    const idToken = user?.idToken;
    const mezonUserId = user?.mezonUserId;
    const username = user?.username;

    const initializationPromise = restoreOrAuthenticateMezonLightClient(
      async () => {
        const storedSession = await storage.getItem(MEZON_LIGHT_SESSION_STORAGE_KEY);
        if (!storedSession || !mezonUserId) {
          return null;
        }

        return restoreMezonLightClientFromStorage(mezonUserId);
      },
      async () => {
        if (!idToken || !mezonUserId || !username) {
          console.warn("[MezonLightProvider] Missing required user information");
          return null;
        }

        return authenticateMezonLightClient({
          idToken,
          userId: mezonUserId,
          username,
          serverKey: MEZON_LIGHT_SERVER_KEY,
          gatewayUrl: getMezonGatewayUrl(),
        });
      },
    );
    initializationPromiseRef.current = initializationPromise;

    try {
      const client = await initializationPromise;
      if (!client) {
        throw new Error("Failed to authenticate with Mezon Light");
      }
      if (
        !canCommitMezonLightInitialization({
          initializationIsCurrent: initializationPromiseRef.current === initializationPromise,
          expectedUserId: mezonUserId,
          currentUserId: currentMezonUserIdRef.current,
          clientUserId: client.userId,
        })
      ) {
        return null;
      }
      setLightClient(client);
      return client;
    } catch (error) {
      if (isMezonSendMessageError(error)) {
        console.warn(`[MezonLightProvider] ${error.code}`);
        throw error;
      }
      console.warn("[MezonLightProvider] Failed to initialize Mezon Light", error);
      return null;
    } finally {
      if (initializationPromiseRef.current === initializationPromise) {
        initializationPromiseRef.current = null;
      }
    }
  }, [setLightClient, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      initializationPromiseRef.current = null;
      setLightClient(null);
      releaseMezonLightSocket();
      void clearMezonLightSessionStorage();
      return;
    }

    void ensureLightClient().catch(() => {
      // Interactive callers surface authentication failures with a recovery action.
    });
  }, [ensureLightClient, isAuthLoading, setLightClient, user]);

  return (
    <MezonLightContext.Provider
      value={{
        lightClient,
        setLightClient,
        ensureLightClient,
      }}
    >
      <MezonLightSocketListener />
      {children}
    </MezonLightContext.Provider>
  );
}

export function useMezonLight() {
  return useContext(MezonLightContext);
}
