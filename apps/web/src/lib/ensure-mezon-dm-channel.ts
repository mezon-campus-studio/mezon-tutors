import type { LightClient } from 'mezon-light-sdk';
import type { UseMutationResult } from '@tanstack/react-query';
import { restoreMezonLightClientFromStorage } from '@/services/mezon-light/mezon-light.client';
import {
  createMezonLightDMWithRetry,
  createMezonLightGroupDMWithRetry,
  refreshMezonLightSession,
} from '@/services/mezon-light/mezon-light.service';
import {
  MEZON_SEND_MESSAGE_ERROR_CODES,
  MezonSendMessageError,
} from '@/lib/mezon-send-message-errors';
import { dmChannelApi } from '@/services/dm-channel/dm-channel.api';
import { ApiError } from '@/services/api-client';

function rethrowMezonAuthExpired(error: unknown): void {
  const body = error instanceof ApiError ? error.body : null;
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : null;
  if (code === MEZON_SEND_MESSAGE_ERROR_CODES.MEZON_AUTH_EXPIRED) {
    throw new MezonSendMessageError(MEZON_SEND_MESSAGE_ERROR_CODES.MEZON_AUTH_EXPIRED);
  }
}

type CreateDmChannelMutation = Pick<
  UseMutationResult<
    unknown,
    Error,
    {
      recipientId: string;
      channelId: string;
      mezonAccessToken: string;
      mezonApiUrl: string;
    },
    unknown
  >,
  'mutateAsync'
>;

export type EnsureMezonDmChannelParams = {
  lightClient: LightClient | null;
  setLightClient: (client: LightClient) => void;
  senderId: string;
  senderMezonUserId: string;
  recipientId: string;
  recipientMezonUserId: string;
  existingChannelId?: string | null;
  createDmChannelMutation: CreateDmChannelMutation;
};

export type EnsureMezonGroupDmChannelParams = {
  lightClient: LightClient | null;
  setLightClient: (client: LightClient) => void;
  senderId: string;
  senderMezonUserId: string;
  mezonUserIds: string[];
  existingChannelId?: string | null;
};

export async function ensureMezonDmChannel(params: EnsureMezonDmChannelParams): Promise<string> {
  const {
    setLightClient,
    senderId,
    senderMezonUserId,
    recipientId,
    recipientMezonUserId,
    existingChannelId,
    createDmChannelMutation,
  } = params;

  if (!senderId || !senderMezonUserId || !recipientMezonUserId || !recipientId) {
    throw new MezonSendMessageError('MISSING_USER_INFO');
  }

  if (existingChannelId) {
    return existingChannelId;
  }

  let client = params.lightClient;
  if (!client) {
    client = await restoreMezonLightClientFromStorage();
    if (!client) {
      throw new MezonSendMessageError('RESTORE_SESSION_FAILED');
    }
    setLightClient(client);
  }

  if (await client.isSessionExpired()) {
    try {
      await refreshMezonLightSession(client);
    } catch {
      console.error('[ensureMezonDmChannel] refresh session failed');
      throw new MezonSendMessageError('REFRESH_SESSION_FAILED');
    }
  }

  const session = client.exportSession();
  const resolvePayload = {
    recipientId,
    mezonAccessToken: client.getToken(),
    mezonApiUrl: session.api_url,
  };

  try {
    const resolved = await dmChannelApi.resolve(resolvePayload);
    if (resolved?.channelId) {
      return resolved.channelId;
    }
  } catch (error) {
    rethrowMezonAuthExpired(error);
    console.warn('[ensureMezonDmChannel] existing DM lookup failed; falling back to DM creation');
  }

  const dmChannel = await createMezonLightDMWithRetry(client, recipientMezonUserId);
  const channelId = dmChannel?.channel_id;
  if (!channelId) {
    throw new MezonSendMessageError('CREATE_DM_CHANNEL_FAILED');
  }

  try {
    await createDmChannelMutation.mutateAsync({
      recipientId,
      channelId,
      mezonAccessToken: resolvePayload.mezonAccessToken,
      mezonApiUrl: resolvePayload.mezonApiUrl,
    });
  } catch (error) {
    rethrowMezonAuthExpired(error);
    try {
      const recovered = await dmChannelApi.resolve(resolvePayload);
      if (recovered?.channelId) {
        return recovered.channelId;
      }
    } catch (error) {
      rethrowMezonAuthExpired(error);
      console.error('[ensureMezonDmChannel] DM recovery failed');
    }
    console.error('[ensureMezonDmChannel] save DM channel failed');
    throw new MezonSendMessageError('SAVE_DM_CHANNEL_FAILED');
  }

  return channelId;
}

export async function ensureMezonGroupDmChannel(
  params: EnsureMezonGroupDmChannelParams
): Promise<string> {
  const { setLightClient, senderId, senderMezonUserId, mezonUserIds, existingChannelId } = params;
  const groupMezonUserIds = Array.from(
    new Set(mezonUserIds.map((id) => id.trim()).filter(Boolean))
  );

  if (!senderId || !senderMezonUserId || groupMezonUserIds.length < 3) {
    throw new MezonSendMessageError('MISSING_USER_INFO');
  }

  if (existingChannelId) {
    return existingChannelId;
  }

  let client = params.lightClient;
  if (!client) {
    client = await restoreMezonLightClientFromStorage();
    if (!client) {
      throw new MezonSendMessageError('RESTORE_SESSION_FAILED');
    }
    setLightClient(client);
  }

  if (await client.isSessionExpired()) {
    try {
      await refreshMezonLightSession(client);
    } catch {
      console.error('[ensureMezonGroupDmChannel] refresh session failed');
      throw new MezonSendMessageError('REFRESH_SESSION_FAILED');
    }
  }

  const groupDmChannel = await createMezonLightGroupDMWithRetry(client, groupMezonUserIds);
  const channelId = groupDmChannel?.channel_id;
  if (!channelId) {
    throw new MezonSendMessageError('CREATE_GROUP_DM_CHANNEL_FAILED');
  }

  return channelId;
}
