import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { dmChannelQueryKey } from "./dm-channel.qkey";

type UpsertDmChannelPayload = {
  studentId: string;
  tutorId: string;
  channelId: string;
};

export type DmChannelRecord = {
  id: string;
  studentId: string;
  tutorId: string;
  channelId: string;
  createdAt: string;
  updatedAt: string;
};

export type MyDmChannelItem = {
  id: string;
  channelId: string;
  studentId: string;
  tutorId: string;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  peerMezonUserId: string;
  updatedAt: string;
};

const dmChannelApi = {
  getByStudentAndTutor(studentId: string, tutorId: string): Promise<DmChannelRecord | null> {
    return apiClient.get("/dm-channels", {
      params: {
        studentId,
        tutorId,
      },
    });
  },

  upsert(payload: UpsertDmChannelPayload): Promise<DmChannelRecord> {
    return apiClient.post("/dm-channels", payload);
  },

  getMyChannels(): Promise<MyDmChannelItem[]> {
    return apiClient.get("/dm-channels/my");
  },
};

export function useGetDmChannel(studentId: string, tutorId: string, enabled = true) {
  return useQuery({
    queryKey: dmChannelQueryKey.byStudentAndTutor(studentId, tutorId),
    queryFn: () => dmChannelApi.getByStudentAndTutor(studentId, tutorId),
    enabled: Boolean(studentId) && Boolean(tutorId) && enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useUpsertDmChannelMutation() {
  return useMutation({
    mutationFn: (payload: UpsertDmChannelPayload) => dmChannelApi.upsert(payload),
  });
}

export function useGetMyDmChannels(enabled = true) {
  return useQuery({
    queryKey: ["my-dm-channels"],
    queryFn: () => dmChannelApi.getMyChannels(),
    enabled,
  });
}
