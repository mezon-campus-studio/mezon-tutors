import { LightClient, LightSocket } from "mezon-light-sdk";

const SEND_DM_MAX_ATTEMPTS = 3;

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMezonLightSocket(client: LightClient) {
  const session = client.getSession();
  return new LightSocket(client, session);
}

export async function refreshMezonLightSession(client: LightClient) {
  return client.refreshSession();
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

export async function sendMezonLightDM(client: LightClient, channelId: string, content: string) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= SEND_DM_MAX_ATTEMPTS; attempt += 1) {
    const socket = createMezonLightSocket(client);

    try {
      await socket.connect();
      await socket.joinDMChannel(channelId);
      await socket.sendDM({ channelId, content: { t: content } });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < SEND_DM_MAX_ATTEMPTS) {
        await delay(500);
      }
    } finally {
      socket.disconnect();
    }
  }

  throw new Error(
    lastError instanceof Error ? `Send DM failed. ${lastError.message}` : "Send DM failed. Connection error.",
  );
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
    await sendMezonLightDM(client, channelId, content);
  }
}
