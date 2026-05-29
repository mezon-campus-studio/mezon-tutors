import type { MezonDirectMessageContent } from "@mezon-tutors/shared";
import type { LightClient } from "mezon-light-sdk";
import type { UseMutationResult } from "@tanstack/react-query";
import { ensureMezonDmChannel } from "@/lib/ensure-mezon-dm-channel";
import { sendMezonLightDMWithRefreshFallback } from "@/services/mezon-light/mezon-light.service";
import { restoreMezonLightClientFromStorage } from "@/services/mezon-light/mezon-light.client";
import { refreshMezonLightSession } from "@/services/mezon-light/mezon-light.service";

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

  const existingChannelId = (await refetchDmChannel()).data?.channelId;
  const channelId = await ensureMezonDmChannel({
    lightClient: params.lightClient,
    setLightClient,
    senderId,
    senderMezonUserId,
    recipientId,
    recipientMezonUserId,
    existingChannelId,
    createDmChannelMutation,
  });

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

  await sendMezonLightDMWithRefreshFallback(client, channelId, content);
}

export const sendStudentLessonDmToTutor = sendLessonDmToPeer;
