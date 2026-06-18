import type { AppSettings, UpdateAppSettingsBody } from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { adminAppSettingsQueryKey } from "./admin-app-settings.qkey";

const BASE = "/admin";

export const adminAppSettingsApi = {
  get(): Promise<AppSettings> {
    return apiClient.get<AppSettings>(`${BASE}/app-settings`);
  },

  update(body: UpdateAppSettingsBody): Promise<AppSettings> {
    return apiClient.put<AppSettings>(`${BASE}/app-settings`, body);
  },
};

export const useAdminAppSettings = (enabled = true) => {
  return useQuery({
    queryKey: adminAppSettingsQueryKey.detail(),
    queryFn: () => adminAppSettingsApi.get(),
    enabled,
  });
};

export const useUpdateAdminAppSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAppSettingsBody) => adminAppSettingsApi.update(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminAppSettingsQueryKey.all });
    },
  });
};
