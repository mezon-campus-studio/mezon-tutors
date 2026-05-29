import type { LightClient } from "mezon-light-sdk";
import type { UseMutationResult } from "@tanstack/react-query";
import { restoreMezonLightClientFromStorage } from "@/services/mezon-light/mezon-light.client";
import {
  createMezonLightDM,
  refreshMezonLightSession,
} from "@/services/mezon-light/mezon-light.service";

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
    throw new Error("Missing user information to open chat.");
  }

  if (existingChannelId) {
    return existingChannelId;
  }

  let client = params.lightClient;
  if (!client) {
    client = await restoreMezonLightClientFromStorage();
    if (!client) {
      throw new Error("Cannot restore Mezon client. Please login again.");
    }
    setLightClient(client);
  }

  if (await client.isSessionExpired()) {
    await refreshMezonLightSession(client);
  }

  const dmChannel = await createMezonLightDM(client, recipientMezonUserId);
  const channelId = dmChannel?.channel_id;
  if (!channelId) {
    throw new Error("Could not create DM channel.");
  }

  await createDmChannelMutation.mutateAsync({
    senderId,
    recipientId,
    channelId,
  });

  return channelId;
}
