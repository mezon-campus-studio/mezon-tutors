import { atom } from 'jotai';

export type GlobalChatMessage = {
  id: string;
  sender: 'me' | 'peer';
  content: string;
};

export const globalChatMessagesByChannelAtom = atom<Record<string, GlobalChatMessage[]>>({});
export const globalChatUnreadChannelIdsAtom = atom<Set<string>>(new Set<string>());
export const globalChatOpenAtom = atom(false);
export const globalChatSelectedChannelIdAtom = atom('');

export const hasGlobalChatUnreadAtom = atom(
  (get) => get(globalChatUnreadChannelIdsAtom).size > 0,
);

export const appendGlobalChatMessageAtom = atom(
  null,
  (
    get,
    set,
    payload: {
      channelId: string;
      message: GlobalChatMessage;
      markUnread?: boolean;
    },
  ) => {
    const { channelId, message, markUnread = true } = payload;
    const prev = get(globalChatMessagesByChannelAtom);
    const existing = prev[channelId] ?? [];
    if (existing.some((item) => item.id === message.id)) {
      return;
    }

    set(globalChatMessagesByChannelAtom, {
      ...prev,
      [channelId]: [...existing, message],
    });

    if (!markUnread) {
      return;
    }

    const unread = new Set(get(globalChatUnreadChannelIdsAtom));
    unread.add(channelId);
    set(globalChatUnreadChannelIdsAtom, unread);
  },
);

export const markGlobalChatChannelReadAtom = atom(null, (get, set, channelId: string) => {
  const unread = new Set(get(globalChatUnreadChannelIdsAtom));
  if (!unread.has(channelId)) {
    return;
  }
  unread.delete(channelId);
  set(globalChatUnreadChannelIdsAtom, unread);
});

export const resetGlobalChatAtom = atom(null, (_get, set) => {
  set(globalChatMessagesByChannelAtom, {});
  set(globalChatUnreadChannelIdsAtom, new Set<string>());
  set(globalChatOpenAtom, false);
  set(globalChatSelectedChannelIdAtom, '');
});
