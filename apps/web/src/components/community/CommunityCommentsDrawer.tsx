"use client";

import { COMMUNITY_CONTENT_LIMITS, type CommunityCommentDto } from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { ArrowBigUp, ChevronDown, ChevronRight, Loader2, Reply, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoginButton } from "@/components/auth/LoginButton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useCommunityComments,
  useCreateCommunityComment,
  useDeleteCommunityComment,
  useToggleCommunityCommentUpvote,
} from "@/services/community/community.api";
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from "@/store";

type CommunityCommentsDrawerProps = {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommunityCommentsDrawer({
  postId,
  open,
  onOpenChange,
}: CommunityCommentsDrawerProps) {
  const t = useTranslations("Community.detail.engagement");
  const locale = useLocale();
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const isLoggedIn = isAuthenticated || Boolean(user);

  const [commentDraft, setCommentDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const { data: comments = [], isLoading } = useCommunityComments(postId, open);
  const createComment = useCreateCommunityComment(postId);
  const deleteComment = useDeleteCommunityComment(postId);
  const toggleUpvote = useToggleCommunityCommentUpvote(postId);

  const handleSubmit = (content: string, parentId?: string) => {
    if (!isLoggedIn) {
      toast.error(t("loginToInteract"));
      return;
    }
    if (!content.trim()) {
      toast.error(t("commentRequired"));
      return;
    }
    createComment.mutate(
      { content: content.trim(), parentId },
      {
        onSuccess: () => {
          setCommentDraft("");
          setReplyDraft("");
          setReplyTo(null);
        },
        onError: () => toast.error(t("commentFailed")),
      },
    );
  };

  const totalCount = (items: CommunityCommentDto[]): number =>
    items.reduce((c, item) => c + 1 + totalCount(item.replies), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-violet-100 px-5 pb-3 pt-5">
          <SheetTitle className="text-lg font-bold text-slate-900">
            {t("comments", { count: totalCount(comments) })}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!isAuthLoading && isLoggedIn ? (
            <div className="space-y-2 border-b border-violet-100 pb-4">
              <Textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={COMMUNITY_CONTENT_LIMITS.comment}
                rows={2}
                className="resize-y border-violet-100 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  className="rounded-full"
                  disabled={createComment.isPending}
                  onClick={() => handleSubmit(commentDraft)}
                >
                  {createComment.isPending ? t("submitting") : t("submitComment")}
                </Button>
              </div>
            </div>
          ) : !isAuthLoading ? (
            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-5 text-center text-sm text-slate-600">
              <p>{t("loginToInteract")}</p>
              <LoginButton label={t("login")} />
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-violet-500" />
            </div>
          ) : comments.length === 0 ? (
            <p className="rounded-xl border border-violet-100 bg-violet-50/30 px-4 py-6 text-center text-sm text-slate-500">
              {t("emptyComments")}
            </p>
          ) : (
            <div className="space-y-5">
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  locale={locale}
                  t={t}
                  isLoggedIn={isLoggedIn}
                  replyTo={replyTo}
                  replyDraft={replyDraft}
                  isCreating={createComment.isPending}
                  onSetReplyTo={setReplyTo}
                  onSetReplyDraft={setReplyDraft}
                  onSubmitReply={(parentId) => handleSubmit(replyDraft, parentId)}
                  onDelete={(id) =>
                    deleteComment.mutate(id, { onError: () => toast.error(t("deleteFailed")) })
                  }
                  onUpvote={(id) =>
                    toggleUpvote.mutate(id, { onError: () => toast.error(t("upvoteFailed")) })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CommentThread({
  comment,
  locale,
  t,
  isLoggedIn,
  replyTo,
  replyDraft,
  isCreating,
  onSetReplyTo,
  onSetReplyDraft,
  onSubmitReply,
  onDelete,
  onUpvote,
}: {
  comment: CommunityCommentDto;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoggedIn: boolean;
  replyTo: { id: string; username: string } | null;
  replyDraft: string;
  isCreating: boolean;
  onSetReplyTo: (v: { id: string; username: string } | null) => void;
  onSetReplyDraft: (v: string) => void;
  onSubmitReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  onUpvote: (id: string) => void;
}) {
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const isReplying = replyTo?.id === comment.id;
  const hasReplies = comment.replies.length > 0;

  return (
    <div>
      <div className="flex items-start gap-3">
        <Avatar className="size-8 shrink-0 border border-violet-100">
          <AvatarImage src={comment.author.avatar} alt={comment.author.username} />
          <AvatarFallback className="text-xs">
            {comment.author.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-sm font-semibold text-slate-800">{comment.author.username}</span>
            <span className="text-xs text-slate-400">
              {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(comment.createdAt))}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {comment.isDeleted ? t("deletedComment") : comment.content}
          </p>
          {!comment.isDeleted ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onUpvote(comment.id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1 text-xs font-medium",
                  comment.isUpvoted ? "text-violet-600" : "text-slate-400 hover:text-violet-600",
                )}
              >
                <ArrowBigUp className={cn("size-4", comment.isUpvoted && "fill-current")} />
                {comment.upvoteCount > 0 ? comment.upvoteCount : null}
              </button>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() =>
                    isReplying
                      ? onSetReplyTo(null)
                      : onSetReplyTo({ id: comment.id, username: comment.author.username })
                  }
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-slate-400 hover:text-violet-600"
                >
                  <Reply className="size-3.5" />
                  {t("reply")}
                </button>
              ) : null}
              {hasReplies ? (
                <button
                  type="button"
                  onClick={() => setRepliesExpanded(!repliesExpanded)}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-slate-400 hover:text-violet-600"
                >
                  {repliesExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  {t("replies", { count: comment.replies.length })}
                </button>
              ) : null}
              {comment.isMine ? (
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                  {t("deleteComment")}
                </button>
              ) : null}
            </div>
          ) : null}
          {isReplying ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyDraft}
                onChange={(e) => onSetReplyDraft(e.target.value)}
                placeholder={`${t("replyPlaceholder")} ${comment.author.username}...`}
                maxLength={COMMUNITY_CONTENT_LIMITS.comment}
                rows={2}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onSetReplyTo(null)}>
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  className="rounded-full"
                  disabled={isCreating}
                  onClick={() => onSubmitReply(comment.id)}
                >
                  {t("reply")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {hasReplies && repliesExpanded ? (
        <div className="ml-11 mt-3 space-y-4 border-l-2 border-violet-100 pl-4">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              locale={locale}
              t={t}
              isLoggedIn={isLoggedIn}
              replyTo={replyTo}
              replyDraft={replyDraft}
              isCreating={isCreating}
              onSetReplyTo={onSetReplyTo}
              onSetReplyDraft={onSetReplyDraft}
              onSubmitReply={onSubmitReply}
              onDelete={onDelete}
              onUpvote={onUpvote}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
