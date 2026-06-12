import type { MezonDirectMessageContent } from "@mezon-tutors/shared";
import { LightClient, LightSocket } from "mezon-light-sdk";
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
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const dmChannel = await createMezonLightDM(client, userId);
      if (dmChannel?.channel_id) {
        return dmChannel;
      }
      lastError = new Error("DM channel response missing channel_id");
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await refreshMezonLightSession(client);
      releaseMezonLightSocket();
      await wait(CREATE_DM_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not create DM channel.");
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
  } catch {
    await refreshMezonLightSession(client);
    releaseMezonLightSocket();
    await sendMezonLightDM(client, channelId, content);
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
