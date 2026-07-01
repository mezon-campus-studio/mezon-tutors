'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { ExternalLinkIcon, InfoIcon, MessageCircleMoreIcon, SendIcon, AlertCircle } from 'lucide-react';
import { MEZON_CHAT_URL, MEZON_DIRECT_MESSAGE_URL } from '@mezon-tutors/shared';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  MezonSendMessageError,
  resolveMezonSendMessageError,
} from '@/lib/mezon-send-message-errors';
import { userAtom } from '@/store/auth.atom';
import {
  appendGlobalChatMessageAtom,
  globalChatMessagesByChannelAtom,
  globalChatOpenAtom,
  globalChatSelectedChannelIdAtom,
  globalChatUnreadChannelIdsAtom,
  hasGlobalChatUnreadAtom,
  markGlobalChatChannelReadAtom,
} from '@/store/global-chat.atom';
import { useMezonLight } from '@/providers';
import {
  persistMezonLightSession,
  refreshMezonLightSession,
  restoreMezonLightClientFromStorage,
  sendMezonLightDMWithRefreshFallback,
  useGetMyDmChannels,
} from '@/services';
import { buildFakeMessages, getRandomFakeSetIndex } from './global-chat.fake';

const MIN_ROWS = 1;
const MAX_ROWS = 5;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ChatMessageBubble({
  content,
  isMine,
}: {
  content: string;
  isMine: boolean;
}) {
  return (
    <div className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[min(85%,20rem)] px-3.5 py-2 text-sm leading-relaxed shadow-sm',
          isMine
            ? 'rounded-2xl rounded-br-md bg-violet-600 text-white'
            : 'rounded-2xl rounded-bl-md border border-violet-100/90 bg-white text-slate-800',
        )}
      >
        {content}
      </div>
    </div>
  );
}

export default function GlobalChatBubble() {
  const t = useTranslations('GlobalChat');
  const tSendErrors = useTranslations('GlobalChat.sendErrors');
  const currentUser = useAtomValue(userAtom);
  const { lightClient, setLightClient } = useMezonLight();
  const [open, setOpen] = useAtom(globalChatOpenAtom);
  const [selectedChannelId, setSelectedChannelId] = useAtom(globalChatSelectedChannelIdAtom);
  const [fakeSetIndex, setFakeSetIndex] = useState(0);
  const [messageContent, setMessageContent] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesByChannel = useAtomValue(globalChatMessagesByChannelAtom);
  const unreadChannelIds = useAtomValue(globalChatUnreadChannelIdsAtom);
  const hasUnread = useAtomValue(hasGlobalChatUnreadAtom);
  const appendMessage = useSetAtom(appendGlobalChatMessageAtom);
  const markChannelRead = useSetAtom(markGlobalChatChannelReadAtom);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: channels = [] } = useGetMyDmChannels(Boolean(currentUser?.id));

  const selectedChannel = useMemo(() => {
    if (!channels.length) {
      return null;
    }
    const fallback = channels[0];
    return channels.find((item) => item.channelId === selectedChannelId) ?? fallback;
  }, [channels, selectedChannelId]);

  const conversationMessages = selectedChannel
    ? (messagesByChannel[selectedChannel.channelId] ?? [])
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

  useEffect(() => {
    if (!open || !selectedChannel?.channelId) {
      return;
    }
    markChannelRead(selectedChannel.channelId);
  }, [markChannelRead, open, selectedChannel?.channelId]);

  useEffect(() => {
    if (!channels.length || selectedChannelId) {
      return;
    }
    setSelectedChannelId(channels[0].channelId);
  }, [channels, selectedChannelId, setSelectedChannelId]);

  useEffect(() => {
    if (!open || !selectedChannel) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length, open, selectedChannel?.channelId]);

  useEffect(() => {
    setMessageError('');
  }, [selectedChannel?.channelId]);

  const handleSend = async () => {
    const content = messageContent.trim();
    if (!content || !selectedChannel || !currentUser) {
      return;
    }

    setMessageError('');
    setIsSending(true);
    try {
      let client = lightClient;
      if (!client) {
        client = await restoreMezonLightClientFromStorage();
        if (!client) {
          throw new MezonSendMessageError('RESTORE_SESSION_FAILED');
        }
        setLightClient(client);
      }

      const isSessionExpired = await client.isSessionExpired();
      if (isSessionExpired) {
        try {
          await refreshMezonLightSession(client);
          await persistMezonLightSession(client);
        } catch (error) {
          console.error('[GlobalChatBubble] refresh session failed', error);
          throw new MezonSendMessageError('REFRESH_SESSION_FAILED');
        }
      }

      await sendMezonLightDMWithRefreshFallback(client, selectedChannel.channelId, content);
      appendMessage({
        channelId: selectedChannel.channelId,
        message: {
          id: `runtime-${Date.now()}`,
          sender: 'me',
          content,
        },
        markUnread: false,
      });
      setMessageContent('');
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.focus();
      });
    } catch (error) {
      setMessageError(resolveMezonSendMessageError(error, tSendErrors));
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
    if (messageError) {
      setMessageError('');
    }
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
    'bg-brand-gradient text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50';

  return (
    <>
      <div className="fixed z-40 right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6">
        <Button
          size="icon-lg"
          className={cn(
            'relative size-14 shrink-0 rounded-full border-0 p-0',
            ctaGradientClass,
            'focus-visible:ring-2 focus-visible:ring-violet-400/50',
          )}
          onClick={() => setOpen(true)}
          aria-label={t('chatButton')}
        >
          <MessageCircleMoreIcon className="size-6" />
          {hasUnread ? (
            <span
              className="absolute top-1 right-1 size-3 rounded-full border-2 border-white bg-red-500"
              aria-hidden
            />
          ) : null}
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

          <div className="grid h-[480px] shrink-0 grid-cols-1 overflow-hidden md:grid-cols-[240px_1fr]">
            <div className="flex h-full min-h-0 flex-col overflow-hidden border-b border-violet-100/80 bg-violet-50/35 md:border-b-0 md:border-r">
              <div className="shrink-0 px-4 py-3 sm:px-5">
                <p className="text-xs font-semibold tracking-wide text-violet-600 uppercase">
                  {t('listTitle')}
                </p>
              </div>
              {channels.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-slate-500 sm:px-5">{t('emptyList')}</p>
              ) : (
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3 sm:px-3">
                  {channels.map((item) => {
                    const isActive = selectedChannel?.channelId === item.channelId;
                    const hasChannelUnread = unreadChannelIds.has(item.channelId);
                    return (
                      <button
                        key={item.channelId}
                        type="button"
                        onClick={() => setSelectedChannelId(item.channelId)}
                        className={cn(
                          'relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors cursor-pointer',
                          isActive
                            ? 'bg-white text-violet-900 shadow-sm ring-1 ring-violet-200/80'
                            : 'text-slate-700 hover:bg-white/70',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold',
                            isActive
                              ? 'bg-violet-600 text-white'
                              : 'bg-violet-100 text-violet-700',
                          )}
                        >
                          {item.peerAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.peerAvatar}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            getInitials(item.peerName)
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {item.peerName}
                        </span>
                        {hasChannelUnread ? (
                          <span
                            className="size-2 shrink-0 rounded-full bg-red-500"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#faf8ff_0%,#ffffff_38%)]">
              {!selectedChannel ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <MessageCircleMoreIcon className="size-10 text-violet-300" />
                  <p className="text-sm text-slate-500">{t('emptyConversation')}</p>
                </div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-violet-100/80 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                        {selectedChannel.peerAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedChannel.peerAvatar}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          getInitials(selectedChannel.peerName)
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {selectedChannel.peerName}
                        </p>
                        <p className="text-xs text-slate-500">{t('eyebrow')}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-full border-violet-200 px-3 text-xs text-violet-700 hover:bg-violet-50"
                      onClick={() =>
                        window.open(
                          MEZON_DIRECT_MESSAGE_URL(selectedChannel.channelId),
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                    >
                      <ExternalLinkIcon className="size-3.5" />
                      Mezon
                    </Button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3">
                      {conversationMessages.length === 0
                        ? fakeMessages.map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                'pointer-events-none max-w-[min(85%,20rem)] select-none rounded-2xl px-3.5 py-2 text-sm leading-relaxed blur-[5px] opacity-60',
                                message.sender === mySenderRole
                                  ? 'ml-auto rounded-br-md bg-violet-200 text-violet-900'
                                  : 'rounded-bl-md border border-violet-100/80 bg-white text-slate-600',
                              )}
                            >
                              {message.content}
                            </div>
                          ))
                        : conversationMessages.map((message) => (
                            <ChatMessageBubble
                              key={message.id}
                              content={message.content}
                              isMine={message.sender === 'me'}
                            />
                          ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <div className="shrink-0 space-y-2 border-t border-violet-100/80 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-5">
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                      <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
                      <span>
                        {t.rich('noticeMezonChat', {
                          link: (chunks) => (
                            <a
                              href={MEZON_DIRECT_MESSAGE_URL(selectedChannel.channelId)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-violet-700 hover:underline"
                            >
                              {chunks}
                            </a>
                          ),
                        })}
                      </span>
                    </p>

                    {messageError ? (
                      <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                        <p className="text-xs leading-5 text-rose-700">{messageError}</p>
                      </div>
                    ) : null}

                    <div className="flex items-end gap-2 rounded-2xl border border-violet-100 bg-slate-50/80 p-2 ring-1 ring-violet-50">
                      <textarea
                        ref={textareaRef}
                        rows={MIN_ROWS}
                        value={messageContent}
                        onChange={handleChange}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder={t('inputPlaceholder')}
                        className="max-h-24 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        onClick={() => void handleSend()}
                        disabled={isSending || !messageContent.trim()}
                        aria-label={t('send')}
                        className={cn(
                          'size-9 shrink-0 rounded-xl border-0',
                          ctaGradientClass,
                          'disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none',
                        )}
                      >
                        <SendIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
