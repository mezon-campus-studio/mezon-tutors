"use client";

import { isLoadingAtom, userAtom } from "@/store/auth.atom";
import {
  authenticateMezonLightClient,
  clearMezonLightSessionStorage,
  restoreMezonLightClientFromStorage,
} from "@/services/mezon-light/mezon-light.client";
import { MEZON_LIGHT_SERVER_KEY } from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { LightClient } from "mezon-light-sdk";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setLightClient(null);
      void clearMezonLightSessionStorage();
      return;
    }

    const initMezonClient = async () => {
      if (lightClient) {
        return;
      }

      const restoredClient = await restoreMezonLightClientFromStorage();
      if (restoredClient) {
        setLightClient(restoredClient);
        return;
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
  }, [isAuthLoading, lightClient, user]);

  return (
    <MezonLightContext.Provider
      value={{
        lightClient,
        setLightClient,
      }}
    >
      {children}
    </MezonLightContext.Provider>
  );
}

export function useMezonLight() {
  return useContext(MezonLightContext);
}
