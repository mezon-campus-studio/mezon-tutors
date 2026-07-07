"use client";

import { Bookmark, Loader2, ArrowBigUp, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type CommunityEngagementButtonsProps = {
  upvoteCount: number;
  commentCount: number;
  bookmarkCount?: number;
  isUpvoted: boolean;
  isBookmarked?: boolean;
  isUpvotePending?: boolean;
  isBookmarkPending?: boolean;
  onUpvote: () => void;
  onBookmark?: () => void;
  onOpenComments: () => void;
};

export function CommunityEngagementButtons({
  upvoteCount,
  commentCount,
  isUpvoted,
  isBookmarked,
  isUpvotePending,
  isBookmarkPending,
  onUpvote,
  onBookmark,
  onOpenComments,
}: CommunityEngagementButtonsProps) {
  const t = useTranslations("Community.detail.engagement");

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={onUpvote}
        disabled={isUpvotePending}
        aria-label={t("upvote")}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 text-sm font-medium transition-colors",
          isUpvoted ? "text-violet-600" : "text-slate-400 hover:text-violet-600",
        )}
      >
        {isUpvotePending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <ArrowBigUp className={cn("size-5", isUpvoted && "fill-current")} />
        )}
        {upvoteCount}
      </button>

      <button
        type="button"
        onClick={onOpenComments}
        className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-violet-600"
      >
        <MessageSquare className="size-5" />
        {commentCount}
      </button>

      {onBookmark ? (
        <button
          type="button"
          onClick={onBookmark}
          disabled={isBookmarkPending}
          aria-label={t("bookmark")}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1 text-sm font-medium transition-colors",
            isBookmarked ? "text-violet-600" : "text-slate-400 hover:text-violet-600",
          )}
        >
          {isBookmarkPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Bookmark className={cn("size-5", isBookmarked && "fill-current")} />
          )}
        </button>
      ) : null}
    </div>
  );
}
