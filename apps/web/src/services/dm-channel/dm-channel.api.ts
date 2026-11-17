import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api-client';
import { dmChannelQueryKey } from './dm-channel.qkey';

export type CreateDmChannelPayload = {
  recipientId: string;
  channelId: string;
  mezonAccessToken: string;
  mezonApiUrl: string;
};

export type ResolveDmChannelPayload = Omit<CreateDmChannelPayload, 'channelId'>;

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

export const dmChannelApi = {
  getBetweenUsers(peerUserId: string): Promise<DmChannelRecord | null> {
    return apiClient.get('/dm-channels', {
      params: {
        peerUserId,
      },
    });
  },

  create(payload: CreateDmChannelPayload): Promise<DmChannelRecord> {
    return apiClient.post('/dm-channels', payload);
  },

  resolve(payload: ResolveDmChannelPayload): Promise<DmChannelRecord | null> {
    return apiClient.post('/dm-channels/resolve', payload);
  },

  getMyChannels(): Promise<MyDmChannelItem[]> {
    return apiClient.get('/dm-channels/my');
  },
};

export function useGetDmChannel(userId: string, peerUserId: string, enabled = true) {
  return useQuery({
    queryKey: dmChannelQueryKey.byParticipantPair(userId, peerUserId),
    queryFn: () => dmChannelApi.getBetweenUsers(peerUserId),
    enabled: Boolean(userId) && Boolean(peerUserId) && enabled,
  });
}

export function useCreateDmChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDmChannelPayload) => dmChannelApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['dm-channel', 'pair'],
      });
      void queryClient.invalidateQueries({ queryKey: dmChannelQueryKey.myChannels });
    },
  });
}

export function useGetMyDmChannels(enabled = true) {
  return useQuery({
    queryKey: dmChannelQueryKey.myChannels,
    queryFn: () => dmChannelApi.getMyChannels(),
    enabled,
  });
}
