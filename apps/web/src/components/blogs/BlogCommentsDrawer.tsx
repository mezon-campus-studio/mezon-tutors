"use client";

import { BLOG_CONTENT_LIMITS, type BlogCommentDto } from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { ArrowBigUp, ChevronDown, ChevronRight, Loader2, Reply, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  useBlogComments,
  useCreateBlogComment,
  useDeleteBlogComment,
  useToggleCommentUpvote,
} from "@/services/blog/blog.api";
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from "@/store";
import { LoginButton } from "../auth/LoginButton";

type BlogCommentsDrawerProps = {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BlogCommentsDrawer({ slug, open, onOpenChange }: BlogCommentsDrawerProps) {
  const t = useTranslations("Blogs.detail.engagement");
  const locale = useLocale();
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const isLoggedIn = isAuthenticated || Boolean(user);

  const [commentDraft, setCommentDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const { data: comments = [], isLoading: isLoadingComments } = useBlogComments(slug);

  const createComment = useCreateBlogComment(slug);
  const deleteComment = useDeleteBlogComment(slug);
  const toggleCommentUpvote = useToggleCommentUpvote(slug);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!target || !target.isConnected) return;
      const sheetContent = document.querySelector('[data-slot="sheet-content"]');
      if (sheetContent && !sheetContent.contains(target)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  const handleSubmitComment = () => {
    if (!isLoggedIn) {
      toast.error(t("loginToInteract"));
      return;
    }
    const content = commentDraft.trim();
    if (!content) {
      toast.error(t("commentRequired"));
      return;
    }
    createComment.mutate(
      { content },
      {
        onSuccess: () => setCommentDraft(""),
        onError: () => toast.error(t("commentFailed")),
      },
    );
  };

  const handleSubmitReply = (parentId: string) => {
    if (!isLoggedIn) {
      toast.error(t("loginToInteract"));
      return;
    }
    const content = replyDraft.trim();
    if (!content) {
      toast.error(t("commentRequired"));
      return;
    }
    createComment.mutate(
      { content, parentId },
      {
        onSuccess: () => {
          setReplyDraft("");
          setReplyTo(null);
        },
        onError: () => toast.error(t("commentFailed")),
      },
    );
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment.mutate(commentId, {
      onError: () => toast.error(t("deleteFailed")),
    });
  };

  const handleToggleUpvote = (commentId: string) => {
    if (!isLoggedIn) {
      toast.error(t("loginToInteract"));
      return;
    }
    toggleCommentUpvote.mutate(commentId, {
      onError: () => toast.error(t("upvoteFailed")),
    });
  };

  const totalCommentCount = (items: BlogCommentDto[]): number =>
    items.reduce((count, item) => count + 1 + totalCommentCount(item.replies), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal="trap-focus">
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-violet-100">
          <SheetTitle className="text-lg font-bold text-slate-900">
            {t("comments", { count: totalCommentCount(comments) })}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!isAuthLoading && isLoggedIn ? (
            <div className="space-y-2 pb-4 border-b border-violet-100">
              <Textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={BLOG_CONTENT_LIMITS.comment}
                rows={2}
                disabled={createComment.isPending}
                className="resize-y border-violet-100 bg-white text-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="gradient"
                  onClick={handleSubmitComment}
                  disabled={createComment.isPending}
                  size="sm"
                  className="rounded-full"
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

          {isLoadingComments ? (
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
                  depth={0}
                  locale={locale}
                  t={t}
                  isLoggedIn={isLoggedIn}
                  replyTo={replyTo}
                  replyDraft={replyDraft}
                  isCreating={createComment.isPending}
                  onSetReplyTo={setReplyTo}
                  onSetReplyDraft={setReplyDraft}
                  onSubmitReply={handleSubmitReply}
                  onDelete={handleDeleteComment}
                   onUpvote={handleToggleUpvote}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type CommentThreadProps = {
  comment: BlogCommentDto;
  depth: number;
  locale: string;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
  isLoggedIn: boolean;
  replyTo: { id: string; username: string } | null;
  replyDraft: string;
  isCreating: boolean;
  onSetReplyTo: (reply: { id: string; username: string } | null) => void;
  onSetReplyDraft: (draft: string) => void;
  onSubmitReply: (parentId: string) => void;
  onDelete: (commentId: string) => void;
  onUpvote: (commentId: string) => void;
};

function CommentThread({
  comment,
  depth,
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
}: CommentThreadProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);

  const isReplying = replyTo?.id === comment.id;
  const hasReplies = comment.replies.length > 0;
  const totalReplies = hasReplies
    ? comment.replies.reduce((count, r) => count + 1 + countNested(r), 0)
    : 0;

  return (
    <div>
      <div className={cn("flex items-start gap-3", depth > 0 && "")}>
        <Avatar className={cn("border border-violet-100 shrink-0", depth > 0 ? "size-7" : "size-8")}>
          <AvatarImage src={comment.author.avatar} alt={comment.author.username} />
          <AvatarFallback className="text-xs">
            {comment.author.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-slate-800">
              {comment.author.username}
            </span>
            <span className="text-xs text-slate-400">
              {formatCommentDate(comment.createdAt, locale)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {comment.content}
          </p>
          <div className="mt-1.5 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => onUpvote(comment.id)}
              aria-label={t("upvote")}
              className={cn(
                "cursor-pointer inline-flex items-center gap-1 text-xs font-medium transition-colors",
                comment.isUpvoted
                  ? "text-violet-600"
                  : "text-slate-400 hover:text-violet-600",
              )}
            >
              <ArrowBigUp
                className={cn("size-4", comment.isUpvoted && "fill-current")}
              />
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
                className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-violet-600"
              >
                <Reply className="size-3.5" />
                {t("reply")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.error(t("loginToInteract"))}
                className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-violet-600"
              >
                <Reply className="size-3.5" />
                {t("reply")}
              </button>
            )}
            {hasReplies ? (
              <button
                type="button"
                onClick={() => {
                  if (repliesExpanded) {
                    setRepliesExpanded(false);
                    if (isReplying) {
                      onSetReplyTo(null);
                      onSetReplyDraft("");
                    }
                  } else {
                    setRepliesExpanded(true);
                    if (isLoggedIn) {
                      onSetReplyTo({ id: comment.id, username: comment.author.username });
                      onSetReplyDraft("");
                    }
                  }
                }}
                className={cn(
                  "cursor-pointer inline-flex items-center gap-1 text-xs font-medium transition-colors",
                  repliesExpanded
                    ? "text-violet-600"
                    : "text-slate-400 hover:text-violet-600",
                )}
              >
                {repliesExpanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                {t("replies", { count: totalReplies })}
              </button>
            ) : null}
            {comment.isMine ? (
              <button
                type="button"
                onClick={() => {
                  setIsDeleting(true);
                  onDelete(comment.id);
                }}
                disabled={isDeleting}
                className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
                {t("deleteComment")}
              </button>
            ) : null}
          </div>

          {isReplying ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyDraft}
                onChange={(event) => onSetReplyDraft(event.target.value)}
                placeholder={`${t("replyPlaceholder")} ${comment.author.username}...`}
                maxLength={BLOG_CONTENT_LIMITS.comment}
                rows={2}
                disabled={isCreating}
                className="resize-y border-violet-100 bg-violet-50/30 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    onSetReplyTo(null);
                    onSetReplyDraft("");
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onSubmitReply(comment.id)}
                  disabled={isCreating}
                >
                  {isCreating ? t("submitting") : t("reply")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {hasReplies && repliesExpanded ? (
        <div className="mt-3 space-y-4 border-l-2 border-violet-100 pl-4 ml-[18px]">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              depth={depth + 1}
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

function countNested(comment: BlogCommentDto): number {
  return comment.replies.reduce((count, r) => count + 1 + countNested(r), 0);
}

function formatCommentDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
