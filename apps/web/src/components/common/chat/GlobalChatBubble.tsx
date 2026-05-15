'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { InfoIcon, MessageCircleMoreIcon } from 'lucide-react';
import { MEZON_CHAT_URL, MEZON_DIRECT_MESSAGE_URL, MEZON_URL } from '@mezon-tutors/shared';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
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
  const mySenderRole = useMemo<'sender' | 'recipient' | null>(() => {
    if (!selectedChannel || !currentUser?.id) {
      return null;
    }
    return selectedChannel.senderId === currentUser.id ? 'sender' : 'recipient';
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

  const ctaGradientClass =
    'bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50';

  return (
    <>
      <div className="fixed z-40 right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6">
        <Button
          size="icon-lg"
          className={cn(
            'size-14 shrink-0 rounded-full border-0 p-0',
            ctaGradientClass,
            'focus-visible:ring-2 focus-visible:ring-violet-400/50',
          )}
          onClick={() => setOpen(true)}
          aria-label={t('chatButton')}
        >
          <MessageCircleMoreIcon className="size-6" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            'flex max-h-[min(90vh,680px)] w-[calc(100%-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-4xl',
            'rounded-2xl border border-violet-100/90 bg-white ring-violet-200/30',
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-violet-100/80 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_55%)] px-5 pb-4 pt-10 sm:px-6 sm:pb-5 sm:pt-11">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
              {t('eyebrow')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <DialogTitle className="text-left text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {t('title')}
              </DialogTitle>
              <Button
                size="sm"
                className={cn(
                  'h-10 w-full shrink-0 rounded-full border-0 px-5 text-sm font-semibold text-white sm:w-auto',
                  ctaGradientClass,
                  'focus-visible:ring-2 focus-visible:ring-violet-400/50',
                )}
                onClick={() => window.open(MEZON_CHAT_URL, '_blank', 'noopener,noreferrer')}
              >
                {t('openMezon')}
              </Button>
            </div>
          </DialogHeader>

          <div className="grid min-h-[min(320px,45vh)] flex-1 gap-0 md:min-h-0 md:grid-cols-[minmax(0,260px)_1fr] md:divide-x md:divide-violet-100/80">
            <Card className="min-h-0 rounded-none border-0 py-3 shadow-none ring-0 md:rounded-none">
              <div className="flex h-full min-h-0 flex-col gap-3 px-4 sm:px-5">
                <p className="text-sm font-semibold text-slate-900">{t('listTitle')}</p>
                {channels.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('emptyList')}</p>
                ) : null}
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 md:max-h-[min(52vh,420px)]">
                  {channels.map((item) => (
                    <Button
                      key={item.channelId}
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-auto min-h-10 w-full justify-start rounded-xl border-slate-200 px-3 py-2.5 text-left text-sm font-medium whitespace-normal text-slate-800 hover:border-violet-200 hover:bg-violet-50/80 hover:text-violet-900',
                        selectedChannel?.channelId === item.channelId &&
                          cn('border-transparent text-white', ctaGradientClass, 'hover:text-white'),
                      )}
                      onClick={() => setSelectedChannelId(item.channelId)}
                    >
                      {item.peerName}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="min-h-0 rounded-none border-0 py-3 shadow-none ring-0 md:rounded-none">
              {!selectedChannel ? (
                <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-sm text-slate-500 sm:px-6">
                  {t('emptyConversation')}
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-5">
                  <p className="text-base font-bold text-slate-900">{selectedChannel.peerName}</p>

                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-violet-100/80 bg-slate-50/60 p-3 sm:p-4">
                    {fakeMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-2 text-sm blur-[1.5px] opacity-70 sm:max-w-[75%]',
                          message.sender === mySenderRole
                            ? cn('ml-auto text-white', ctaGradientClass)
                            : 'bg-white text-slate-700 ring-1 ring-violet-100/80',
                        )}
                      >
                        {message.content}
                      </div>
                    ))}

                    {runtimeMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'ml-auto max-w-[85%] rounded-2xl px-3 py-2 text-sm text-white sm:max-w-[75%]',
                          ctaGradientClass,
                        )}
                      >
                        {message.content}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-violet-200/50 bg-violet-50/70 p-3 sm:p-4">
                    <div className="mb-2 flex items-center gap-2 text-violet-800">
                      <InfoIcon className="size-4 shrink-0 sm:size-5" />
                      <span className="text-sm font-semibold sm:text-base">{t('noticeTitle')}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {t('noticePrefix')}{' '}
                      <a
                        href={MEZON_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
                      >
                        {t('noticeLink')}
                      </a>
                      <br />
                      {t('noticeOpenChatPrefix')}{' '}
                      <a
                        href={MEZON_DIRECT_MESSAGE_URL(selectedChannel.channelId)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
                      >
                        {t('noticeOpenChatLink')}
                      </a>{' '}
                      {t('noticeOpenChatSuffix')}
                    </p>
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      rows={MIN_ROWS}
                      value={messageContent}
                      onChange={handleChange}
                      placeholder={t('inputPlaceholder')}
                      className="max-h-24 min-h-10 w-full resize-none rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:border-violet-300 focus-visible:ring-2 focus-visible:ring-violet-400/25"
                    />
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={isSending || !messageContent.trim()}
                      className={cn(
                        'h-10 shrink-0 rounded-full px-5 font-semibold',
                        ctaGradientClass,
                        'disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none',
                      )}
                    >
                      {isSending ? t('sending') : t('send')}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
