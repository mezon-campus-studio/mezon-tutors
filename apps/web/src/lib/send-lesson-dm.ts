import type { MezonDirectMessageContent } from "@mezon-tutors/shared";
import type { LightClient } from "mezon-light-sdk";
import type { UseMutationResult } from "@tanstack/react-query";
import { restoreMezonLightClientFromStorage } from "@/services/mezon-light/mezon-light.client";
import {
  createMezonLightDM,
  refreshMezonLightSession,
  sendMezonLightDMWithRefreshFallback,
} from "@/services/mezon-light/mezon-light.service";

type CreateDmChannelMutation = Pick<
  UseMutationResult<unknown, Error, { senderId: string; recipientId: string; channelId: string }, unknown>,
  "mutateAsync"
>;

export type SendLessonDmParams = {
  lightClient: LightClient | null;
  setLightClient: (client: LightClient) => void;
  senderId: string;
  senderMezonUserId: string;
  recipientId: string;
  recipientMezonUserId: string;
  refetchDmChannel: () => Promise<{ data?: { channelId?: string } | null }>;
  createDmChannelMutation: CreateDmChannelMutation;
  content: MezonDirectMessageContent;
};

export async function sendLessonDmToPeer(params: SendLessonDmParams): Promise<void> {
  const {
    setLightClient,
    senderId,
    senderMezonUserId,
    recipientId,
    recipientMezonUserId,
    refetchDmChannel,
    createDmChannelMutation,
    content,
  } = params;

  if (!senderId || !senderMezonUserId || !recipientMezonUserId || !recipientId) {
    throw new Error("Missing user information to send message.");
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

  let channelId = (await refetchDmChannel()).data?.channelId;
  if (!channelId) {
    const dmChannel = await createMezonLightDM(client, recipientMezonUserId);
    channelId = dmChannel?.channel_id;
    if (!channelId) {
      throw new Error("Could not create DM channel.");
    }

    await createDmChannelMutation.mutateAsync({
      senderId,
      recipientId,
      channelId,
    });
  }

  await sendMezonLightDMWithRefreshFallback(client, channelId, content);
}

/** @deprecated Use sendLessonDmToPeer */
export const sendStudentLessonDmToTutor = sendLessonDmToPeer;
