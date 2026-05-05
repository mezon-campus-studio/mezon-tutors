'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { InfoIcon, MessageCircleMoreIcon } from 'lucide-react';
import { MEZON_CHAT_URL, MEZON_DIRECT_MESSAGE_URL, MEZON_URL } from '@mezon-tutors/shared';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { userAtom } from '@/store/auth.atom';
import { useMezonLight } from '@/providers';
import {
  persistMezonLightSession,
  refreshMezonLightSession,
  restoreMezonLightClientFromStorage,
  sendMezonLightDMWithRefreshFallback,
  useGetMyDmChannels,
} from '@/services';
import { buildFakeMessages, getRandomFakeSetIndex } from './global-chat.fake';

type RuntimeMessage = {
  id: string;
  sender: 'me';
  content: string;
};

const MIN_ROWS = 1;
const MAX_ROWS = 5;

export default function GlobalChatBubble() {
  const t = useTranslations('GlobalChat');
  const currentUser = useAtomValue(userAtom);
  const { lightClient, setLightClient } = useMezonLight();
  const [open, setOpen] = useState(false);
  const [fakeSetIndex, setFakeSetIndex] = useState(0);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [runtimeMessagesByChannel, setRuntimeMessagesByChannel] = useState<
    Record<string, RuntimeMessage[]>
  >({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: channels = [] } = useGetMyDmChannels(Boolean(currentUser?.id));

  const selectedChannel = useMemo(() => {
    if (!channels.length) {
      return null;
    }
    const fallback = channels[0];
    return channels.find((item) => item.channelId === selectedChannelId) ?? fallback;
  }, [channels, selectedChannelId]);

  const runtimeMessages = selectedChannel
    ? (runtimeMessagesByChannel[selectedChannel.channelId] ?? [])
    : [];
  const mySenderRole = useMemo<'student' | 'tutor' | null>(() => {
    if (!selectedChannel || !currentUser?.id) {
      return null;
    }
    return selectedChannel.studentId === currentUser.id ? 'student' : 'tutor';
  }, [selectedChannel, currentUser?.id]);

  const fakeMessages = useMemo(
    () => (selectedChannel ? buildFakeMessages(t, selectedChannel.peerName, fakeSetIndex) : []),
    [selectedChannel, fakeSetIndex, t]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setFakeSetIndex(getRandomFakeSetIndex());
  }, [open]);

  const handleSend = async () => {
    const content = messageContent.trim();
    if (!content || !selectedChannel || !currentUser) {
      return;
    }

    setIsSending(true);
    try {
      let client = lightClient;
      if (!client) {
        client = await restoreMezonLightClientFromStorage();
        if (!client) {
          throw new Error(t('restoreError'));
        }
        setLightClient(client);
      }

      const isSessionExpired = await client.isSessionExpired();
      if (isSessionExpired) {
        await refreshMezonLightSession(client);
        await persistMezonLightSession(client);
      }

      await sendMezonLightDMWithRefreshFallback(client, selectedChannel.channelId, content);
      setRuntimeMessagesByChannel((prev) => ({
        ...prev,
        [selectedChannel.channelId]: [
          ...(prev[selectedChannel.channelId] ?? []),
          {
            id: `runtime-${Date.now()}`,
            sender: 'me',
            content,
          },
        ],
      }));
      setMessageContent('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    setMessageContent(event.target.value);
    el.style.height = 'auto';

    const lineHeight = 20;
    const maxHeight = lineHeight * MAX_ROWS;

    if (el.scrollHeight > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflowY = 'hidden';
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <div className="fixed right-6 bottom-6 z-40">
        <Button
          className="h-12 w-12 rounded-full p-0 shadow-md"
          onClick={() => setOpen(true)}
          aria-label={t('chatButton')}
        >
          <MessageCircleMoreIcon className="size-6" />
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="h-[min(90vh,620px)] max-w-[95vw] sm:max-w-5xl pt-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-4">
              <DialogTitle className="text-4xl leading-0 font-bold text-primary">
                {t('title')}
              </DialogTitle>
              <Button
                variant="outline"
                size="lg"
                className="text-xl p-4 font-semibold"
                onClick={() => window.open(MEZON_CHAT_URL, '_blank', 'noopener,noreferrer')}
              >
                {t('openMezon')}
              </Button>
            </div>
            <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[280px_1fr]">
              <Card className="min-h-0 p-3">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{t('listTitle')}</p>
                  {channels.length === 0 ? (
                    <p className="text-md text-muted-foreground">{t('emptyList')}</p>
                  ) : null}
                  <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                    {channels.map((item) => (
                      <Button
                        key={item.channelId}
                        variant={
                          selectedChannel?.channelId === item.channelId ? 'default' : 'outline'
                        }
                        className="w-full justify-start text-lg p-4"
                        onClick={() => setSelectedChannelId(item.channelId)}
                      >
                        {item.peerName}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="min-h-0 p-3">
                {!selectedChannel ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t('emptyConversation')}
                  </div>
                ) : (
                  <div className="flex h-full min-h-0 flex-col gap-3">
                    <p className="text-lg font-semibold">{selectedChannel.peerName}</p>

                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                      {fakeMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm blur-[1.5px] opacity-70 ${
                            message.sender === mySenderRole
                              ? 'ml-auto bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {message.content}
                        </div>
                      ))}

                      {runtimeMessages.map((message) => (
                        <div
                          key={message.id}
                          className="ml-auto max-w-[75%] rounded-2xl bg-primary px-3 py-2 text-md text-primary-foreground"
                        >
                          {message.content}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-blue-300/45 bg-muted/60 p-3">
                      <div className="mb-1 flex items-center gap-2 text-amber-600">
                        <InfoIcon className="size-6" />
                        <span className="text-lg font-semibold">{t('noticeTitle')}</span>
                      </div>
                      <p className="text-md text-muted-foreground">
                        {t('noticePrefix')}{' '}
                        <a
                          href={MEZON_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-primary"
                        >
                          {t('noticeLink')}
                        </a>
                        <br />
                        {t('noticeOpenChatPrefix')}{' '}
                        <a
                          href={MEZON_DIRECT_MESSAGE_URL(selectedChannel.channelId)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-primary"
                        >
                          {t('noticeOpenChatLink')}
                        </a>{' '}
                        {t('noticeOpenChatSuffix')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <textarea
                        ref={textareaRef}
                        rows={MIN_ROWS}
                        value={messageContent}
                        onChange={handleChange}
                        placeholder={t('inputPlaceholder')}
                        className="max-h-24 w-full resize-none rounded-2xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={isSending || !messageContent.trim()}
                        className="text-lg"
                      >
                        {isSending ? t('sending') : t('send')}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
