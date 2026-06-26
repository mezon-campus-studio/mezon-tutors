import { useQuery } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import {
  apiClient,
  credentialsApiClient,
  refreshAccessTokenWithLock,
  resetRefreshTokenLock,
} from "@/services/api-client";
import { accessTokenAtom } from "@/store/token.atom";
import { storage } from "../storage/storage.service";
import { base64EncodeUtf8 } from "@/lib/mezon-channel-app";

export type AuthUser = {
  id?: string;
  mezonUserId?: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string;
  idToken?: string | null;
  timezone?: string | null;
};

export type ExchangeResponse = {
  user: AuthUser & Record<string, unknown>;
  accessToken: string;
  idToken?: string | null;
};

export type MeResponse = {
  sub?: string;
  id?: string;
  mezonUserId?: string;
  email?: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role?: string;
  timezone?: string | null;
  idToken?: string | null;
};

class AuthService {
  private readonly store = getDefaultStore();

  async loginWithChannelAppHash(rawHashData: string): Promise<ExchangeResponse> {
    const data = await credentialsApiClient.post<ExchangeResponse>(
      "/auth/channel-app/login",
      { hashData: base64EncodeUtf8(rawHashData) },
      { headers: { "Content-Type": "application/json" } }
    );
    this.store.set(accessTokenAtom, data.accessToken);
    return data;
  }

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>("/auth/me");
  }

  async updateTimezone(timezone: string): Promise<{ timezone: string | null }> {
    return apiClient.put<{ timezone: string | null }>("/auth/me/timezone", {
      timezone,
    });
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    const accessToken = await refreshAccessTokenWithLock();
    return { accessToken };
  }

  async logout(): Promise<void> {
    try {
      await credentialsApiClient.post("/auth/logout");
    } catch {
      console.error("Failed to logout");
    } finally {
      resetRefreshTokenLock();
      this.store.set(accessTokenAtom, null);
      await storage.clearMezonLightSession();
    }
  }
}

export const authService = new AuthService();
export default authService;

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ["auth", "current-user"],
    queryFn: () => authService.getMe(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
