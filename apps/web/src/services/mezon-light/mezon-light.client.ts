import { MEZON_LIGHT_SERVER_KEY } from '@mezon-tutors/shared';
import { LightClient } from 'mezon-light-sdk';
import { MezonSendMessageError } from '@/lib/mezon-send-message-errors';
import { storage, MEZON_LIGHT_SESSION_STORAGE_KEY } from '../storage/storage.service';

const MEZON_GATEWAY_UPSTREAM = 'https://gw.mezon.ai';

export function getMezonGatewayUrl() {
  return process.env.NEXT_PUBLIC_MEZON_GATEWAY_URL?.trim() || MEZON_GATEWAY_UPSTREAM;
}

export function extractHostFromUrl(urlOrHost: string): string {
  if (!urlOrHost) return '';
  try {
    if (urlOrHost.includes('://')) {
      return new URL(urlOrHost).hostname;
    }
  } catch {
    // ignore
  }
  return urlOrHost
    .replace(/^https?:\/\//i, '')
    .replace(/^wss?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:.*$/, '')
    .trim();
}

export function rewriteMezonWsHost(hostOrUrl: string): string {
  const configuredGateway = getMezonGatewayUrl();
  const configuredHost = extractHostFromUrl(configuredGateway);
  const upstreamHost = extractHostFromUrl(MEZON_GATEWAY_UPSTREAM);
  const currentHost = extractHostFromUrl(hostOrUrl);

  if (currentHost === upstreamHost && configuredHost) {
    return configuredHost;
  }
  return currentHost || configuredHost || upstreamHost;
}

export function rewriteMezonApiUrl(url: string): string {
  const proxyUrl = getMezonGatewayUrl();
  if (!proxyUrl || proxyUrl === MEZON_GATEWAY_UPSTREAM) {
    return url;
  }

  return url.replaceAll(MEZON_GATEWAY_UPSTREAM, proxyUrl);
}

function rewriteMezonGatewayUrl(url: string) {
  return rewriteMezonApiUrl(url);
}
type MezonAuthenticateOptions = {
  idToken: string;
  userId: string;
  username: string;
  serverKey?: string;
  gatewayUrl?: string;
};

type MezonSessionOptions = {
  token: string;
  refreshToken: string;
  apiUrl: string;
  wsUrl: string;
  userId: string;
  serverKey?: string;
};

type SerializedMezonSession = {
  token?: string;
  refresh_token?: string;
  api_url?: string;
  ws_url?: string;
  user_id?: string;
};

function isValidSerializedSession(session: SerializedMezonSession) {
  return Boolean(
    session?.token &&
      session?.refresh_token &&
      session?.api_url &&
      session?.ws_url &&
      session?.user_id
  );
}

function getBrowserSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage;
}

export async function authenticateMezonLightClient(options: MezonAuthenticateOptions) {
  let client: LightClient;
  try {
    client = await LightClient.authenticate({
      id_token: options.idToken,
      user_id: options.userId,
      username: options.username,
      serverkey: options.serverKey,
      gateway_url: options.gatewayUrl ?? getMezonGatewayUrl(),
    });
  } catch (error) {
    if (error instanceof Response && [400, 401, 403].includes(error.status)) {
      await clearMezonLightSessionStorage();
      throw new MezonSendMessageError('MEZON_AUTH_EXPIRED');
    }
    throw error;
  }

  await persistMezonLightSession(client);
  return client;
}

export async function initMezonLightClientFromSession(options: MezonSessionOptions) {
  return LightClient.initClient({
    token: options.token,
    refresh_token: options.refreshToken,
    api_url: options.apiUrl,
    ws_url: options.wsUrl,
    user_id: options.userId,
    serverkey: options.serverKey,
  });
}

export async function persistMezonLightSession(client: LightClient) {
  const session = client.exportSession() as SerializedMezonSession;
  if (!isValidSerializedSession(session)) {
    return;
  }

  await storage.setItem(MEZON_LIGHT_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function restoreMezonLightClientFromStorage(expectedUserId?: string) {
  try {
    const rawSession = await storage.getItem(MEZON_LIGHT_SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    const parsedSession = JSON.parse(rawSession) as SerializedMezonSession;
    if (!isValidSerializedSession(parsedSession)) {
      await clearMezonLightSessionStorage();
      return null;
    }
    if (expectedUserId && parsedSession.user_id !== expectedUserId) {
      await clearMezonLightSessionStorage();
      return null;
    }

    return initMezonLightClientFromSession({
      token: parsedSession.token as string,
      refreshToken: parsedSession.refresh_token as string,
      apiUrl: rewriteMezonApiUrl(parsedSession.api_url as string),
      wsUrl: rewriteMezonWsHost(parsedSession.ws_url as string),
      userId: parsedSession.user_id as string,
      serverKey: MEZON_LIGHT_SERVER_KEY,
    });
  } catch {
    return null;
  }
}

export async function clearMezonLightSessionStorage() {
  await storage.removeItem(MEZON_LIGHT_SESSION_STORAGE_KEY);
}

export type { MezonAuthenticateOptions, MezonSessionOptions };
