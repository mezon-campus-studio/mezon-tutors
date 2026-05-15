"use client";

import type { TrustShowcaseAvatarDto } from "@mezon-tutors/shared";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export const userTrustShowcaseAvatarsQueryKey = ["trust-showcase-avatars"] as const;

export const userApi = {
  getTrustShowcaseAvatars(): Promise<TrustShowcaseAvatarDto[]> {
    return apiClient.get("/users/trust-showcase-avatars");
  },
};

export function useTrustShowcaseAvatars() {
  return useQuery({
    queryKey: userTrustShowcaseAvatarsQueryKey,
    queryFn: () => userApi.getTrustShowcaseAvatars(),
    staleTime: 1000 * 60 * 15,
  });
}
