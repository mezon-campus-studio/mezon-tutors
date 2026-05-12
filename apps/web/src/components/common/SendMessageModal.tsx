"use client";

import { AlertCircle, MessageCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@/components/ui";
import { useMezonLight } from "@/providers";
import {
  createMezonLightDM,
  persistMezonLightSession,
  refreshMezonLightSession,
  restoreMezonLightClientFromStorage,
  sendMezonLightDMWithRefreshFallback,
  useGetDmChannel,
  useCreateDmChannelMutation,
} from "@/services";

type SendMessageModalProps = {
  open: boolean;
  title: string;
  senderId: string;
  senderMezonUserId: string;
  recipientId: string;
  recipientMezonUserId: string;
  onOpenChangeAction: (open: boolean) => void;
};

export function SendMessageModal({
  open,
  title,
  senderId,
  senderMezonUserId,
  recipientId,
  recipientMezonUserId,
  onOpenChangeAction,
}: SendMessageModalProps) {
  const t = useTranslations("Tutors.TutorCard");
  const [messageContent, setMessageContent] = useState("");
  const [messageError, setMessageError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { lightClient, setLightClient } = useMezonLight();
  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, recipientId, false);
  const createDmChannelMutation = useCreateDmChannelMutation();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setMessageError("");
    }
    onOpenChangeAction(nextOpen);
  };

  const handleSend = async () => {
    const content = messageContent.trim();

    if (!senderId) {
      setMessageError(t("messageModal.errors.missingStudentId"));
      return;
    }
    if (!senderMezonUserId) {
      setMessageError(t("messageModal.errors.missingStudentMezonUserId"));
      return;
    }
    if (!recipientMezonUserId) {
      setMessageError(t("messageModal.errors.missingTutorMezonUserId"));
      return;
    }
    if (!recipientId) {
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
          throw new Error(
            "Cannot restore Mezon client from storage. Please login again.",
          );
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
        const dmChannel = await createMezonLightDM(client, recipientMezonUserId);
        channelId = dmChannel?.channel_id;
        if (!channelId) {
          throw new Error(t("messageModal.errors.missingChannelId"));
        }

        await createDmChannelMutation.mutateAsync({
          senderId,
          recipientId,
          channelId,
        });
      }

      await sendMezonLightDMWithRefreshFallback(client, channelId, content);
      setMessageContent("");
      setMessageError("");
      onOpenChangeAction(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("messageModal.errors.sendFailed");
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

  const charLimit = 1000;
  const charCount = messageContent.length;
  const isOverLimit = charCount > charLimit;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden gap-0 rounded-3xl border-violet-100 p-0 shadow-2xl shadow-violet-300/30 sm:max-w-lg">
        <DialogHeader className="space-y-0 border-b border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-5 py-4 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
              <MessageCircle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                Direct message
              </p>
              <DialogTitle className="truncate text-base font-extrabold text-slate-900 sm:text-lg">
                {t("messageModal.title", { tutorName: title })}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div className="relative">
            <Textarea
              value={messageContent}
              onChange={(event) => {
                setMessageContent(event.target.value);
                if (messageError) {
                  setMessageError("");
                }
              }}
              placeholder={t("messageModal.placeholder")}
              className="min-h-32 resize-none rounded-2xl border-slate-200 bg-slate-50/60 px-4 py-3 text-sm leading-6 transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
            />
            <div className="absolute bottom-2 right-3 text-[10px] font-medium text-slate-400">
              <span className={isOverLimit ? "text-rose-500" : ""}>
                {charCount}
              </span>
              <span> / {charLimit}</span>
            </div>
          </div>

          {messageError ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
              <p className="text-xs leading-5 text-rose-700">{messageError}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-5 py-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="h-10 rounded-full border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            onClick={handleClear}
            disabled={isSendingMessage || !messageContent}
          >
            {t("messageModal.clear")}
          </Button>
          <Button
            className="group h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none"
            onClick={handleSend}
            disabled={isSendingMessage || !messageContent.trim() || isOverLimit}
          >
            <Send className="mr-1.5 size-4 transition-transform group-hover:translate-x-0.5" />
            {isSendingMessage
              ? t("messageModal.sending")
              : t("messageModal.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
