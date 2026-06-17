import type { MezonDirectMessageContent } from "@mezon-tutors/shared";
import { LightClient, LightSocket } from "mezon-light-sdk";
import { MezonSendMessageError } from "@/lib/mezon-send-message-errors";
import { persistMezonLightSession } from "./mezon-light.client";

export type MezonLightDmContent = string | MezonDirectMessageContent;

function toMezonLightPayload(content: MezonLightDmContent): MezonDirectMessageContent {
  return typeof content === "string" ? { t: content } : content;
}

export function createMezonLightSocket(client: LightClient) {
  return new LightSocket(client, client.getSession());
}

export async function refreshMezonLightSession(client: LightClient) {
  await client.refreshSession();
  await persistMezonLightSession(client);
}

export function exportMezonLightSession(client: LightClient) {
  return client.exportSession();
}

export async function createMezonLightDM(client: LightClient, userId: string) {
  return client.createDM(userId);
}

const CREATE_DM_MAX_ATTEMPTS = 3;
const CREATE_DM_RETRY_DELAY_MS = 400;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createMezonLightDMWithRetry(
  client: LightClient,
  userId: string,
  maxAttempts = CREATE_DM_MAX_ATTEMPTS,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const dmChannel = await createMezonLightDM(client, userId);
      if (dmChannel?.channel_id) {
        return dmChannel;
      }
      console.error("[createMezonLightDMWithRetry] DM response missing channel_id", dmChannel);
    } catch (error) {
      console.error("[createMezonLightDMWithRetry] create DM failed", error);
    }

    if (attempt < maxAttempts) {
      try {
        await refreshMezonLightSession(client);
      } catch (error) {
        console.error("[createMezonLightDMWithRetry] refresh session failed", error);
      }
      releaseMezonLightSocket();
      await wait(CREATE_DM_RETRY_DELAY_MS * attempt);
    }
  }

  throw new MezonSendMessageError("CREATE_DM_CHANNEL_FAILED");
}

export async function createMezonLightGroupDMWithRetry(
  client: LightClient,
  userIds: string[],
  maxAttempts = CREATE_DM_MAX_ATTEMPTS,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const dmChannel = await createMezonLightGroupDM(client, userIds);
      if (dmChannel) {
        return dmChannel;
      }
      console.error("[createMezonLightGroupDMWithRetry] DM response missing channel_id", dmChannel);
    } catch (error) {
      console.error("[createMezonLightGroupDMWithRetry] create DM failed", error);
    }

    if (attempt < maxAttempts) {
      try {
        await refreshMezonLightSession(client);
      } catch (error) {
        console.error("[createMezonLightGroupDMWithRetry] refresh session failed", error);
      }
      releaseMezonLightSocket();
      await wait(CREATE_DM_RETRY_DELAY_MS * attempt);
    }
  }

  throw new MezonSendMessageError("CREATE_GROUP_DM_CHANNEL_FAILED");
}

export async function createMezonLightGroupDM(client: LightClient, userIds: string[]) {
  return client.createGroupDM(userIds);
}

let socket: LightSocket | null = null;
const joinedChannels = new Set<string>();
let onIncomingMessage: ((message: { channel_id: string; content: unknown; sender_id: string }) => void) | null =
  null;

async function connect(client: LightClient) {
  if (!socket) {
    socket = createMezonLightSocket(client);
    socket.onChannelMessage((message) => onIncomingMessage?.(message));
  }
  if (!socket.isConnected) {
    await socket.connect();
  }
}

async function joinChannel(channelId: string) {
  if (!socket || !channelId || joinedChannels.has(channelId)) {
    return;
  }
  await socket.joinDMChannel(channelId);
  joinedChannels.add(channelId);
}

export function releaseMezonLightSocket() {
  socket?.disconnect();
  socket = null;
  joinedChannels.clear();
  onIncomingMessage = null;
}

export async function sendMezonLightDM(
  client: LightClient,
  channelId: string,
  content: MezonLightDmContent,
) {
  await connect(client);
  await joinChannel(channelId);
  await socket!.sendDM({ channelId, content: toMezonLightPayload(content) });
}

export async function sendMezonLightDMWithRefreshFallback(
  client: LightClient,
  channelId: string,
  content: MezonLightDmContent,
) {
  try {
    await sendMezonLightDM(client, channelId, content);
  } catch (error) {
    console.error("[sendMezonLightDMWithRefreshFallback] first send failed, retrying", error);
    try {
      await refreshMezonLightSession(client);
    } catch (refreshError) {
      console.error("[sendMezonLightDMWithRefreshFallback] refresh session failed", refreshError);
      throw new MezonSendMessageError("REFRESH_SESSION_FAILED");
    }
    releaseMezonLightSocket();
    try {
      await sendMezonLightDM(client, channelId, content);
    } catch (retryError) {
      console.error("[sendMezonLightDMWithRefreshFallback] retry send failed", retryError);
      throw new MezonSendMessageError("SEND_MESSAGE_FAILED");
    }
  }
}

export async function subscribeMezonLightMessages(
  client: LightClient,
  channelIds: string[],
  handler: (message: { channel_id: string; content: unknown; sender_id: string }) => void,
) {
  await connect(client);
  for (const channelId of channelIds) {
    await joinChannel(channelId);
  }
  onIncomingMessage = handler;
  return () => {
    if (onIncomingMessage === handler) {
      onIncomingMessage = null;
    }
  };
}
