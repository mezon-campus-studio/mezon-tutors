export const appSettingsQueryKey = {
  all: ["app-settings"] as const,
  public: () => [...appSettingsQueryKey.all, "public"] as const,
};
