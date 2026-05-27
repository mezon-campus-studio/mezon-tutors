import type { LightClient } from 'mezon-light-sdk';
import { subscribeMezonLightMessages } from './mezon-light.service';

type IncomingChannelMessage = {
  id?: string;
  message_id?: string;
  channel_id: string;
  content: unknown;
  sender_id: string;
  create_time_seconds?: number;
};

function extractText(value: Record<string, unknown>): string {
  if (typeof value.t === 'string') return value.t;
  if (value.t != null) return String(value.t);
  return '';
}

export function parseMezonChannelMessageContent(content: unknown): string {
  if (content == null) return '';
  if (typeof content === 'object') return extractText(content as Record<string, unknown>);
  if (typeof content !== 'string') return String(content);

  const trimmed = content.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return extractText(parsed) || trimmed;
  } catch {
    return trimmed;
  }
}

export function toGlobalChatMessageId(message: IncomingChannelMessage): string {
  return message.id || message.message_id || `${message.channel_id}-${message.create_time_seconds ?? Date.now()}`;
}

export async function startMezonLightSocketListener(options: {
  client: LightClient;
  channelIds: string[];
  currentMezonUserId: string;
  onMessage: (message: IncomingChannelMessage, parsedContent: string) => void;
  onError?: (error: unknown) => void;
}) {
  const { client, channelIds, currentMezonUserId, onMessage, onError } = options;
  try {
    return await subscribeMezonLightMessages(client, channelIds, (message) => {
      if (message.sender_id === currentMezonUserId) return;
      const parsedContent = parseMezonChannelMessageContent(message.content);
      if (!parsedContent) return;
      onMessage(message as IncomingChannelMessage, parsedContent);
    });
  } catch (error) {
    onError?.(error);
    throw error;
  }
}
