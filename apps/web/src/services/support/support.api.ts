import type { SupportAdminContact } from "@mezon-tutors/shared";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

const BASE = "/support";

export const supportApi = {
  getAdminContact(): Promise<SupportAdminContact> {
    return apiClient.get<SupportAdminContact>(`${BASE}/admin-contact`);
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
