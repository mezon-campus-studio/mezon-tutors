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
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MEZON_LIGHT_SESSION_STORAGE_KEY, storage } from "@/services";
import { MezonLightSocketListener } from "./MezonLightSocketListener";

type MezonLightContextValue = {
  lightClient: LightClient | null;
  setLightClient: (client: LightClient | null) => void;
};

const MezonLightContext = createContext<MezonLightContextValue>({
  lightClient: null,
  setLightClient: () => {},
});

export function MezonLightProvider({ children }: { children: ReactNode }) {
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const [lightClient, setLightClient] = useState<LightClient | null>(null);
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      initStartedRef.current = false;
      setLightClient(null);
      releaseMezonLightSocket();
      void clearMezonLightSessionStorage();
      return;
    }

    if (initStartedRef.current) {
      return;
    }
    initStartedRef.current = true;

    const initMezonClient = async () => {
      const storedSession = await storage.getItem(MEZON_LIGHT_SESSION_STORAGE_KEY);

      if (storedSession) {
        const restoredClient = await restoreMezonLightClientFromStorage();
        if (restoredClient) {
          setLightClient(restoredClient);
          return;
        }
      }

      if (!user.idToken || !user.mezonUserId || !user.username) {
        console.warn("[MezonLightProvider] Missing required user information");
        return;
      }

      try {
        const client = await authenticateMezonLightClient({
          idToken: user.idToken,
          userId: user.mezonUserId,
          username: user.username,
          serverKey: MEZON_LIGHT_SERVER_KEY,
          gatewayUrl: getMezonGatewayUrl(),
        });

        if (!client) {
          throw new Error("Failed to authenticate with Mezon Light");
        }
        setLightClient(client);
      } catch (error) {
        console.warn("[MezonLightProvider] Failed to authenticate with Mezon Light", error);
      }
    };

    void initMezonClient();
  }, [isAuthLoading, user]);

  return (
    <MezonLightContext.Provider
      value={{
        lightClient,
        setLightClient,
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
