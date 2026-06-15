import type { SupportAdminContact } from "@mezon-tutors/shared";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

const BASE = "/support";

export const supportApi = {
  getAdminContact(): Promise<SupportAdminContact> {
    return apiClient.get<SupportAdminContact>(`${BASE}/admin-contact`);
  },

  getBotContact(): Promise<SupportAdminContact> {
    return apiClient.get<SupportAdminContact>(`${BASE}/bot-contact`);
  },
};

export function useGetSupportAdminContact(enabled = true) {
  return useQuery({
    queryKey: ["support", "admin-contact"],
    queryFn: () => supportApi.getAdminContact(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGetSupportBotContact(enabled = true) {
  return useQuery({
    queryKey: ["support", "bot-contact"],
    queryFn: () => supportApi.getBotContact(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
