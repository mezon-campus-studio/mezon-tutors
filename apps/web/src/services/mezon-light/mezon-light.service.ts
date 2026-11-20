import type { MezonDirectMessageContent } from '@mezon-tutors/shared';
import { type LightClient, LightSocket } from 'mezon-light-sdk';
import { MezonSendMessageError, isMezonSendMessageError } from '@/lib/mezon-send-message-errors';
import { persistMezonLightSession, rewriteMezonWsHost } from './mezon-light.client';

export type MezonLightDmContent = string | MezonDirectMessageContent;

function toMezonLightPayload(content: MezonLightDmContent): MezonDirectMessageContent {
  return typeof content === 'string' ? { t: content } : content;
}

export function createMezonLightSocket(client: LightClient) {
  const session = client.getSession();
  if (session && session.ws_url) {
    const cleanWs = rewriteMezonWsHost(session.ws_url);
    if (session.ws_url !== cleanWs) {
      (session as { ws_url: string }).ws_url = cleanWs;
    }
  }
  return new LightSocket(client, session);
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
  maxAttempts = CREATE_DM_MAX_ATTEMPTS
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const dmChannel = await createMezonLightDM(client, userId);
      if (dmChannel?.channel_id) {
        return dmChannel;
      }
      console.error('[createMezonLightDMWithRetry] DM response missing channel_id', dmChannel);
    } catch {
      console.error('[createMezonLightDMWithRetry] create DM failed');
    }

    if (attempt < maxAttempts) {
      try {
        await refreshMezonLightSession(client);
      } catch {
        console.error('[createMezonLightDMWithRetry] refresh session failed');
      }
      resetMezonLightSocketConnection();
      await wait(CREATE_DM_RETRY_DELAY_MS * attempt);
    }
  }

  throw new MezonSendMessageError('CREATE_DM_CHANNEL_FAILED');
}

export async function createMezonLightGroupDMWithRetry(
  client: LightClient,
  userIds: string[],
  maxAttempts = CREATE_DM_MAX_ATTEMPTS
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const dmChannel = await createMezonLightGroupDM(client, userIds);
      if (dmChannel) {
        return dmChannel;
      }
      console.error('[createMezonLightGroupDMWithRetry] DM response missing channel_id', dmChannel);
    } catch {
      console.error('[createMezonLightGroupDMWithRetry] create DM failed');
    }

    if (attempt < maxAttempts) {
      try {
        await refreshMezonLightSession(client);
      } catch {
        console.error('[createMezonLightGroupDMWithRetry] refresh session failed');
      }
      resetMezonLightSocketConnection();
      await wait(CREATE_DM_RETRY_DELAY_MS * attempt);
    }
  }

  throw new MezonSendMessageError('CREATE_GROUP_DM_CHANNEL_FAILED');
}

export async function createMezonLightGroupDM(client: LightClient, userIds: string[]) {
  return client.createGroupDM(userIds);
}

let socket: LightSocket | null = null;
let socketClient: LightClient | null = null;
let socketConnectPromise: Promise<void> | null = null;
const joinedChannels = new Set<string>();
const joiningChannels = new Map<string, Promise<void>>();
let onIncomingMessage:
  | ((message: { channel_id: string; content: unknown; sender_id: string }) => void)
  | null = null;
const MEZON_CONNECT_TIMEOUT_MS = 8_000;
const MEZON_JOIN_TIMEOUT_MS = 8_000;
const MEZON_SEND_ACK_TIMEOUT_MS = 10_000;

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new MezonSendMessageError('SEND_MESSAGE_FAILED')),
      timeoutMs
    );
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function connect(client: LightClient) {
  if (socket && socketClient !== client) {
    resetMezonLightSocketConnection();
  }
  if (!socket) {
    socket = createMezonLightSocket(client);
    socketClient = client;
    socket.onChannelMessage((message) => onIncomingMessage?.(message));
  }
  if (socket.isConnected) {
    return;
  }
  if (!socketConnectPromise) {
    joinedChannels.clear();
    joiningChannels.clear();
    const connectingSocket = socket;
    const connection = withTimeout(connectingSocket.connect(), MEZON_CONNECT_TIMEOUT_MS).catch(
      (error) => {
        if (socket === connectingSocket) {
          resetMezonLightSocketConnection();
        }
        throw error;
      }
    );
    const trackedConnection = connection.finally(() => {
      if (socketConnectPromise === trackedConnection) {
        socketConnectPromise = null;
      }
    });
    socketConnectPromise = trackedConnection;
  }
  await socketConnectPromise;
}

async function joinChannel(channelId: string) {
  if (!socket || !channelId || joinedChannels.has(channelId)) {
    return;
  }
  const pendingJoin = joiningChannels.get(channelId);
  if (pendingJoin) {
    await pendingJoin;
    return;
  }

  const joiningSocket = socket;
  const join = withTimeout(joiningSocket.joinDMChannel(channelId), MEZON_JOIN_TIMEOUT_MS)
    .then(() => {
      if (socket === joiningSocket) {
        joinedChannels.add(channelId);
      }
    })
    .catch((error) => {
      joinedChannels.delete(channelId);
      throw error;
    });

  joiningChannels.set(channelId, join);
  try {
    await join;
  } finally {
    if (joiningChannels.get(channelId) === join) {
      joiningChannels.delete(channelId);
    }
  }
}

function resetMezonLightSocketConnection() {
  socket?.disconnect();
  socket = null;
  socketClient = null;
  socketConnectPromise = null;
  joinedChannels.clear();
  joiningChannels.clear();
}

export function releaseMezonLightSocket() {
  resetMezonLightSocketConnection();
  onIncomingMessage = null;
}

export async function sendMezonLightDM(
  client: LightClient,
  channelId: string,
  content: MezonLightDmContent
) {
  await connect(client);
  await joinChannel(channelId);
  if (!socket) {
    throw new MezonSendMessageError('SEND_MESSAGE_FAILED');
  }
  await withTimeout(
    socket.sendDM({ channelId, content: toMezonLightPayload(content) }),
    MEZON_SEND_ACK_TIMEOUT_MS
  );
}

export async function sendMezonLightDMWithRefreshFallback(
  client: LightClient,
  channelId: string,
  content: MezonLightDmContent
) {
  try {
    await sendMezonLightDM(client, channelId, content);
  } catch (error) {
    if (isMezonSendMessageError(error) && error.code === 'SEND_MESSAGE_FAILED') {
      resetMezonLightSocketConnection();
      throw error;
    }
    console.error('[sendMezonLightDMWithRefreshFallback] first send failed, retrying');
    try {
      await refreshMezonLightSession(client);
    } catch {
      console.error('[sendMezonLightDMWithRefreshFallback] refresh session failed');
      throw new MezonSendMessageError('REFRESH_SESSION_FAILED');
    }
    resetMezonLightSocketConnection();
    try {
      await sendMezonLightDM(client, channelId, content);
    } catch {
      console.error('[sendMezonLightDMWithRefreshFallback] retry send failed');
      throw new MezonSendMessageError('SEND_MESSAGE_FAILED');
    }
  }
}

export async function subscribeMezonLightMessages(
  client: LightClient,
  channelIds: string[],
  handler: (message: { channel_id: string; content: unknown; sender_id: string }) => void
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
