'use client';

import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  appendGlobalChatMessageAtom,
  globalChatOpenAtom,
  globalChatSelectedChannelIdAtom,
  resetGlobalChatAtom,
  type GlobalChatMessage,
} from '@/store/global-chat.atom';
import { userAtom } from '@/store/auth.atom';
import { useGetMyDmChannels } from '@/services';
import {
  startMezonLightSocketListener,
  toGlobalChatMessageId,
} from '@/services/mezon-light/mezon-light.socket';
import { useMezonLight } from './MezonLightProvider';

export function MezonLightSocketListener() {
  const user = useAtomValue(userAtom);
  const { lightClient } = useMezonLight();
  const isChatOpen = useAtomValue(globalChatOpenAtom);
  const selectedChannelId = useAtomValue(globalChatSelectedChannelIdAtom);
  const appendMessage = useSetAtom(appendGlobalChatMessageAtom);
  const resetChat = useSetAtom(resetGlobalChatAtom);
  const { data: channels = [] } = useGetMyDmChannels(Boolean(user?.id));

  const isChatOpenRef = useRef(isChatOpen);
  const selectedChannelIdRef = useRef(selectedChannelId);

  isChatOpenRef.current = isChatOpen;
  selectedChannelIdRef.current = selectedChannelId;

  const channelIdsKey = channels
    .map((item) => item.channelId)
    .sort()
    .join('|');

  useEffect(() => {
    if (!user) {
      resetChat();
    }
  }, [user, resetChat]);

  useEffect(() => {
    if (!lightClient || !user?.mezonUserId || !channelIdsKey) {
      return;
    }

    let stopListener: (() => void) | undefined;
    let cancelled = false;

    const setup = async () => {
      try {
        stopListener = await startMezonLightSocketListener({
          client: lightClient,
          channelIds: channelIdsKey.split('|'),
          currentMezonUserId: user.mezonUserId,
          onMessage: (message, parsedContent) => {
            const channelId = message.channel_id;
            if (!channelId) {
              return;
            }

            const markUnread =
              !isChatOpenRef.current || selectedChannelIdRef.current !== channelId;

            const chatMessage: GlobalChatMessage = {
              id: toGlobalChatMessageId(message),
              sender: 'peer',
              content: parsedContent,
            };

            appendMessage({ channelId, message: chatMessage, markUnread });
          },
          onError: (error) => {
            console.warn('[MezonLightSocketListener] Socket error', error);
          },
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('[MezonLightSocketListener] Failed to start listener', error);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      stopListener?.();
    };
  }, [appendMessage, channelIdsKey, lightClient, user?.mezonUserId]);

  return null;
}
