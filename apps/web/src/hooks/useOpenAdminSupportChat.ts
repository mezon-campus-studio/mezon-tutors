"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui";
import { ensureMezonDmChannel } from "@/lib/ensure-mezon-dm-channel";
import { useMezonLight } from "@/providers";
import { userAtom } from "@/store/auth.atom";
import {
  globalChatOpenAtom,
  globalChatSelectedChannelIdAtom,
} from "@/store/global-chat.atom";
import { useCreateDmChannelMutation } from "@/services/dm-channel/dm-channel.api";
import { dmChannelQueryKey } from "@/services/dm-channel/dm-channel.qkey";
import { supportApi } from "@/services/support/support.api";
import { apiClient } from "@/services/api-client";
import type { DmChannelRecord } from "@/services/dm-channel/dm-channel.api";

export function useOpenAdminSupportChat() {
  const t = useTranslations("GlobalChat.supportChat");
  const currentUser = useAtomValue(userAtom);
  const { lightClient, setLightClient } = useMezonLight();
  const queryClient = useQueryClient();
  const createDmChannelMutation = useCreateDmChannelMutation();
  const setChatOpen = useSetAtom(globalChatOpenAtom);
  const setSelectedChannelId = useSetAtom(globalChatSelectedChannelIdAtom);
  const [isOpening, setIsOpening] = useState(false);

  const openAdminSupportChat = useCallback(async () => {
    if (!currentUser?.id || !currentUser.mezonUserId) {
      toast.error(t("missingSession"));
      return;
    }

    setIsOpening(true);
    try {
      const admin = await supportApi.getAdminContact();

      let existingChannelId: string | undefined;
      try {
        const record = await apiClient.get<DmChannelRecord | null>("/dm-channels", {
          params: {
            senderId: currentUser.id,
            recipientId: admin.id,
          },
        });
        existingChannelId = record?.channelId;
      } catch {
        existingChannelId = undefined;
      }

      const channelId = await ensureMezonDmChannel({
        lightClient,
        setLightClient,
        senderId: currentUser.id,
        senderMezonUserId: currentUser.mezonUserId,
        recipientId: admin.id,
        recipientMezonUserId: admin.mezonUserId,
        existingChannelId,
        createDmChannelMutation,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-dm-channels"] }),
        queryClient.invalidateQueries({
          queryKey: dmChannelQueryKey.byParticipantPair(currentUser.id, admin.id),
        }),
      ]);
      await queryClient.refetchQueries({ queryKey: ["my-dm-channels"] });

      setSelectedChannelId(channelId);
      setChatOpen(true);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : t("failed"),
      );
    } finally {
      setIsOpening(false);
    }
  }, [
    createDmChannelMutation,
    currentUser,
    lightClient,
    queryClient,
    setChatOpen,
    setLightClient,
    setSelectedChannelId,
    t,
  ]);

  return { openAdminSupportChat, isOpening };
}
