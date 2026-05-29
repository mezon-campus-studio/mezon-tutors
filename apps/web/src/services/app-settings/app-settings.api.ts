import { useQuery } from "@tanstack/react-query";
import type { PublicAppSettings } from "@mezon-tutors/shared";
import { apiClient } from "../api-client";
import { appSettingsQueryKey } from "./app-settings.qkey";

export const appSettingsApi = {
  getPublic(): Promise<PublicAppSettings> {
    return apiClient.get<PublicAppSettings>("/app-settings/public");
  },
};

export function usePublicAppSettings() {
  return useQuery({
    queryKey: appSettingsQueryKey.public(),
    queryFn: () => appSettingsApi.getPublic(),
    staleTime: 5 * 60 * 1000,
  });
}
