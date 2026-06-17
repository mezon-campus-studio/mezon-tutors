import type { LightClient } from "mezon-light-sdk";
import type { UseMutationResult } from "@tanstack/react-query";
import { restoreMezonLightClientFromStorage } from "@/services/mezon-light/mezon-light.client";
import {
  createMezonLightDMWithRetry,
  createMezonLightGroupDMWithRetry,
  refreshMezonLightSession,
} from "@/services/mezon-light/mezon-light.service";
import { MezonSendMessageError } from "@/lib/mezon-send-message-errors";

type CreateDmChannelMutation = Pick<
  UseMutationResult<
    unknown,
    Error,
    { senderId: string; recipientId: string; channelId: string },
    unknown
  >,
  "mutateAsync"
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

export async function ensureMezonDmChannel(
  params: EnsureMezonDmChannelParams,
): Promise<string> {
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
    throw new MezonSendMessageError("MISSING_USER_INFO");
  }

  if (existingChannelId) {
    return existingChannelId;
  }

  let client = params.lightClient;
  if (!client) {
    client = await restoreMezonLightClientFromStorage();
    if (!client) {
      throw new MezonSendMessageError("RESTORE_SESSION_FAILED");
    }
    setLightClient(client);
  }

  if (await client.isSessionExpired()) {
    try {
      await refreshMezonLightSession(client);
    } catch (error) {
      console.error("[ensureMezonDmChannel] refresh session failed", error);
      throw new MezonSendMessageError("REFRESH_SESSION_FAILED");
    }
  }

  const dmChannel = await createMezonLightDMWithRetry(client, recipientMezonUserId);
  const channelId = dmChannel?.channel_id;
  if (!channelId) {
    throw new MezonSendMessageError("CREATE_DM_CHANNEL_FAILED");
  }

  try {
    await createDmChannelMutation.mutateAsync({
      senderId,
      recipientId,
      channelId,
    });
  } catch (error) {
    console.error("[ensureMezonDmChannel] save DM channel failed", error);
    throw new MezonSendMessageError("SAVE_DM_CHANNEL_FAILED");
  }

  return channelId;
}

export async function ensureMezonGroupDmChannel(
  params: EnsureMezonGroupDmChannelParams,
): Promise<string> {
  const {
    setLightClient,
    senderId,
    senderMezonUserId,
    mezonUserIds,
    existingChannelId,
  } = params;
  const groupMezonUserIds = Array.from(
    new Set(mezonUserIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (!senderId || !senderMezonUserId || groupMezonUserIds.length < 3) {
    throw new MezonSendMessageError("MISSING_USER_INFO");
  }

  if (existingChannelId) {
    return existingChannelId;
  }

  let client = params.lightClient;
  if (!client) {
    client = await restoreMezonLightClientFromStorage();
    if (!client) {
      throw new MezonSendMessageError("RESTORE_SESSION_FAILED");
    }
    setLightClient(client);
  }

  if (await client.isSessionExpired()) {
    try {
      await refreshMezonLightSession(client);
    } catch (error) {
      console.error(
        "[ensureMezonGroupDmChannel] refresh session failed",
        error,
      );
      throw new MezonSendMessageError("REFRESH_SESSION_FAILED");
    }
  }

  const groupDmChannel = await createMezonLightGroupDMWithRetry(
    client,
    groupMezonUserIds,
  );
  const channelId = groupDmChannel?.channel_id;
  if (!channelId) {
    throw new MezonSendMessageError("CREATE_GROUP_DM_CHANNEL_FAILED");
  }

  return channelId;
}
