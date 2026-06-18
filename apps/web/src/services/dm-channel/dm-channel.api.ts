import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { dmChannelQueryKey } from "./dm-channel.qkey";

export type CreateDmChannelPayload = {
  senderId: string;
  recipientId: string;
  channelId: string;
};

export type DmChannelRecord = {
  id: string;
  senderId: string;
  recipientId: string;
  channelId: string;
  createdAt: string;
  updatedAt: string;
};

export type MyDmChannelItem = {
  id: string;
  channelId: string;
  senderId: string;
  recipientId: string;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  peerMezonUserId: string;
  updatedAt: string;
};

const dmChannelApi = {
  getBetweenUsers(userId: string, peerUserId: string): Promise<DmChannelRecord | null> {
    return apiClient.get("/dm-channels", {
      params: {
        senderId: userId,
        recipientId: peerUserId,
      },
    });
  },

  create(payload: CreateDmChannelPayload): Promise<DmChannelRecord> {
    return apiClient.post("/dm-channels", payload);
  },

  getMyChannels(): Promise<MyDmChannelItem[]> {
    return apiClient.get("/dm-channels/my");
  },
};

export function useGetDmChannel(userId: string, peerUserId: string, enabled = true) {
  return useQuery({
    queryKey: dmChannelQueryKey.byParticipantPair(userId, peerUserId),
    queryFn: () => dmChannelApi.getBetweenUsers(userId, peerUserId),
    enabled: Boolean(userId) && Boolean(peerUserId) && enabled,
  });
}

export function useCreateDmChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDmChannelPayload) => dmChannelApi.create(payload),
    onSuccess: (_data, payload) => {
      void queryClient.invalidateQueries({
        queryKey: dmChannelQueryKey.byParticipantPair(payload.senderId, payload.recipientId),
      });
      void queryClient.invalidateQueries({ queryKey: ['my-dm-channels'] });
    },
  });
}

export function useGetMyDmChannels(enabled = true) {
  return useQuery({
    queryKey: ["my-dm-channels"],
    queryFn: () => dmChannelApi.getMyChannels(),
    enabled,
  });
}
