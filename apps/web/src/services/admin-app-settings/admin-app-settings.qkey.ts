export const adminAppSettingsQueryKey = {
  all: ["admin-app-settings"] as const,
  detail: () => [...adminAppSettingsQueryKey.all, "detail"] as const,
};
