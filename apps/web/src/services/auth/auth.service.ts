import { apiClient } from "@/services/api-client";
import { getDefaultStore } from "jotai";
import { accessTokenAtom } from "@/store/token.atom";
import { useQuery } from "@tanstack/react-query";
import { storage } from "../storage/storage.service";

export type AuthUser = {
  id?: string;
  mezonUserId?: string;
  username?: string;
  email?: string | null;
  avatar?: string | null;
  role?: string;
  idToken?: string | null;
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
};

type AuthUrlResponse = {
  url: string;
};

class AuthService {
  private readonly store = getDefaultStore();

  async getAuthUrl(): Promise<string> {
    const res = await apiClient.get<AuthUrlResponse>("/auth/url");
    return res.url;
  }

  async exchangeCode(code: string, state: string): Promise<ExchangeResponse> {
    const data = await apiClient.post<ExchangeResponse>("/auth/mezon/exchange", {
      code,
      state,
    });
    this.store.set(accessTokenAtom, data.accessToken);
    return data;
  }

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>("/auth/me");
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    const data = await apiClient.post<{ accessToken: string }>("/auth/refresh");
    this.store.set(accessTokenAtom, data.accessToken);
    return data;
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
