import { LightClient, LightSocket } from "mezon-light-sdk";
import { persistMezonLightSession } from "./mezon-light.client";

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

export async function sendMezonLightDM(client: LightClient, channelId: string, content: string) {
  await connect(client);
  await joinChannel(channelId);
  await socket!.sendDM({ channelId, content: { t: content } });
}

export async function sendMezonLightDMWithRefreshFallback(
  client: LightClient,
  channelId: string,
  content: string,
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
