import { apiClient } from '../api-client';

export interface GroupMember {
  userId: string;
  joinedAt: string;
  user: {
    username: string;
    avatar: string;
    email?: string;
    mezonUserId?: string | null;
  };
}

export interface StudyGroup {
  id: string;
  name: string;
  inviteId: string;
  leaderId: string;
  groupChatChannelId?: string | null;
  createdAt: string;
  members: GroupMember[];
}

export const studyGroupApi = {
  list: (): Promise<StudyGroup[]> => {
    return apiClient.get('/study-groups');
  },

  create: (name: string): Promise<StudyGroup> => {
    return apiClient.post('/study-groups', { name });
  },

  updateName: (id: string, name: string): Promise<StudyGroup> => {
    return apiClient.patch(`/study-groups/${id}`, { name });
  },

  updateGroupChatChannel: (
    id: string,
    channelId: string,
  ): Promise<StudyGroup> => {
    return apiClient.patch(`/study-groups/${id}/group-chat-channel`, {
      channelId,
    });
  },

  getDetail: (id: string): Promise<StudyGroup> => {
    return apiClient.get(`/study-groups/${id}`);
  },

  findByInvite: (inviteId: string): Promise<StudyGroup> => {
    return apiClient.get(`/study-groups/invite/${inviteId}`);
  },

  join: (inviteId: string): Promise<StudyGroup> => {
    return apiClient.post(`/study-groups/join/${inviteId}`);
  }
};
