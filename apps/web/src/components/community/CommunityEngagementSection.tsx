"use client";

import { Loader2, ArrowBigUp, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type CommunityEngagementButtonsProps = {
  upvoteCount: number;
  commentCount: number;
  isUpvoted: boolean;
  isUpvotePending?: boolean;
  onUpvote: () => void;
  onOpenComments: () => void;
};

export function CommunityEngagementButtons({
  upvoteCount,
  commentCount,
  isUpvoted,
  isUpvotePending,
  onUpvote,
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
    </div>
  );
}
