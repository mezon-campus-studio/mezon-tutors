import type { LightClient } from 'mezon-light-sdk';
import { persistMezonLightSession } from './mezon-light.client';
import { createMezonLightSocket, refreshMezonLightSession } from './mezon-light.service';

type IncomingChannelMessage = {
  id?: string;
  message_id?: string;
  channel_id: string;
  content: unknown;
  sender_id: string;
  create_time_seconds?: number;
};

function extractTextFromContentObject(value: Record<string, unknown>): string {
  if (typeof value.t === 'string') {
    return value.t;
  }
  if (value.t != null) {
    return String(value.t);
  }
  if (typeof value.text === 'string') {
    return value.text;
  }
  if (typeof value.content === 'string') {
    return value.content;
  }
  return '';
}

export function parseMezonChannelMessageContent(content: unknown): string {
  if (content == null) {
    return '';
  }

  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) {
      return '';
    }

    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      const fromObject = extractTextFromContentObject(parsed);
      if (fromObject) {
        return fromObject;
      }
    }

    return trimmed;
  }

  if (typeof content === 'object') {
    return extractTextFromContentObject(content as Record<string, unknown>);
  }

  return String(content);
}

export function toGlobalChatMessageId(message: IncomingChannelMessage): string {
  return message.id || message.message_id || `${message.channel_id}-${message.create_time_seconds ?? Date.now()}`;
}

export type MezonLightSocketListenerOptions = {
  client: LightClient;
  channelIds: string[];
  currentMezonUserId: string;
  onMessage: (message: IncomingChannelMessage, parsedContent: string) => void;
  onError?: (error: unknown) => void;
};

export async function startMezonLightSocketListener(options: MezonLightSocketListenerOptions) {
  const { client, channelIds, currentMezonUserId, onMessage, onError } = options;

  if (await client.isSessionExpired()) {
    await refreshMezonLightSession(client);
    await persistMezonLightSession(client);
  }

  const socket = createMezonLightSocket(client);
  await socket.connect({
    onError: (error) => onError?.(error),
  });

  const uniqueChannelIds = [...new Set(channelIds.filter(Boolean))];
  for (const channelId of uniqueChannelIds) {
    await socket.joinDMChannel(channelId);
  }

  const unsubscribe = socket.onChannelMessage((message) => {
    if (message.sender_id === currentMezonUserId) {
      return;
    }

    const parsedContent = parseMezonChannelMessageContent(message.content);
    if (!parsedContent) {
      return;
    }

    onMessage(message as IncomingChannelMessage, parsedContent);
  });

  return () => {
    unsubscribe();
    socket.disconnect();
  };
};
