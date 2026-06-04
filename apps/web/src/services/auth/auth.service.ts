import { useQuery } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { apiClient, refreshAccessTokenWithLock } from "@/services/api-client";
import { accessTokenAtom } from "@/store/token.atom";
import { storage } from "../storage/storage.service";
import { base64EncodeUtf8 } from "@/lib/mezon-channel-app";

export type AuthUser = {
  id?: string;
  mezonUserId?: string;
  username?: string;
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
  avatar?: string | null;
  role?: string;
  timezone?: string | null;
  idToken?: string | null;
};

class AuthService {
  private readonly store = getDefaultStore();

  async loginWithChannelAppHash(rawHashData: string): Promise<ExchangeResponse> {
    const data = await apiClient.post<ExchangeResponse>(
      "/auth/channel-app/login",
      { hashData: base64EncodeUtf8(rawHashData) }
    );
    this.store.set(accessTokenAtom, data.accessToken);
    return data;
  }

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>("/auth/me");
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    const accessToken = await refreshAccessTokenWithLock();
    return { accessToken };
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
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
