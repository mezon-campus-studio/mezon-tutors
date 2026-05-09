"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea } from "@/components/ui";
import { useMezonLight } from "@/providers";
import {
  createMezonLightDM,
  persistMezonLightSession,
  refreshMezonLightSession,
  restoreMezonLightClientFromStorage,
  sendMezonLightDMWithRefreshFallback,
  useGetDmChannel,
  useUpsertDmChannelMutation,
} from "@/services";

type TutorMessageModalProps = {
  open: boolean;
  tutorFirstName: string;
  studentId: string;
  studentMezonUserId?: string;
  tutorId: string;
  tutorMezonUserId?: string;
  onOpenChangeAction: (open: boolean) => void;
};

export function TutorMessageModal({
  open,
  tutorFirstName,
  studentId,
  studentMezonUserId,
  tutorId,
  tutorMezonUserId,
  onOpenChangeAction,
}: TutorMessageModalProps) {
  const t = useTranslations("Tutors.TutorCard");
  const [messageContent, setMessageContent] = useState("");
  const [messageError, setMessageError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { lightClient, setLightClient } = useMezonLight();
  const { refetch: refetchDmChannel } = useGetDmChannel(studentId, tutorId, false);
  const upsertDmChannelMutation = useUpsertDmChannelMutation();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setMessageError("");
    }
    onOpenChangeAction(nextOpen);
  };

  const handleSend = async () => {
    const content = messageContent.trim();

    if (!studentId) {
      setMessageError(t("messageModal.errors.missingStudentId"));
      return;
    }
    if (!studentMezonUserId) {
      setMessageError(t("messageModal.errors.missingStudentMezonUserId"));
      return;
    }
    if (!tutorMezonUserId) {
      setMessageError(t("messageModal.errors.missingTutorMezonUserId"));
      return;
    }
    if (!tutorId) {
      setMessageError(t("messageModal.errors.missingTutorId"));
      return;
    }
    if (!content) {
      setMessageError(t("messageModal.errors.emptyContent"));
      return;
    }

    setMessageError("");
    setIsSendingMessage(true);

    try {
      let client = lightClient;
      if (!client) {
        client = await restoreMezonLightClientFromStorage();
        if (!client) {
          throw new Error("Cannot restore Mezon client from storage. Please login again.");
        }
        setLightClient(client);
      }

      const isSessionExpired = await client.isSessionExpired();
      if (isSessionExpired) {
        await refreshMezonLightSession(client);
        await persistMezonLightSession(client);
      }

      let channelId = (await refetchDmChannel()).data?.channelId;
      if (!channelId) {
        const dmChannel = await createMezonLightDM(client, tutorMezonUserId);
        channelId = dmChannel?.channel_id;
        if (!channelId) {
          throw new Error(t("messageModal.errors.missingChannelId"));
        }

        await upsertDmChannelMutation.mutateAsync({
          studentId,
          tutorId,
          channelId,
        });
      }

      await sendMezonLightDMWithRefreshFallback(client, channelId, content);
      setMessageContent("");
      setMessageError("");
      onOpenChangeAction(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messageModal.errors.sendFailed");
      setMessageError(message);
      console.error(error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleClear = () => {
    setMessageContent("");
    setMessageError("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("messageModal.title", { tutorName: tutorFirstName })}</DialogTitle>
        </DialogHeader>

        <Textarea
          value={messageContent}
          onChange={(event) => {
            setMessageContent(event.target.value);
            if (messageError) {
              setMessageError("");
            }
          }}
          placeholder={t("messageModal.placeholder")}
          className="min-h-28 resize-none"
        />

        {!!messageError && <p className="text-sm text-destructive">{messageError}</p>}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="lg"
            className="text-lg"
            onClick={handleClear}
            disabled={isSendingMessage}
          >
            {t("messageModal.clear")}
          </Button>
          <Button
            size="lg"
            className="text-lg"
            onClick={handleSend}
            disabled={isSendingMessage}
          >
            {isSendingMessage ? t("messageModal.sending") : t("messageModal.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
