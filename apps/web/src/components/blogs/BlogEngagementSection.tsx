"use client";

import { ArrowBigUp, Loader2, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type EngagementButtonsProps = {
  upvoteCount: number;
  commentCount: number;
  isUpvoted: boolean;
  isPending: boolean;
  onUpvote: () => void;
  onOpenComments: () => void;
};

export function EngagementButtons({
  upvoteCount,
  commentCount,
  isUpvoted,
  isPending,
  onUpvote,
  onOpenComments,
}: EngagementButtonsProps) {
  const t = useTranslations("Blogs.detail.engagement");

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={onUpvote}
        disabled={isPending}
        aria-label={t("upvote")}
        className={cn(
          "cursor-pointer inline-flex items-center gap-1 text-sm font-medium transition-colors",
          isUpvoted
            ? "text-violet-600"
            : "text-slate-400 hover:text-violet-600",
        )}
      >
        {isPending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <ArrowBigUp className={cn("size-5", isUpvoted && "fill-current")} />
        )}
        {upvoteCount}
      </button>

      <button
        type="button"
        onClick={onOpenComments}
        className="cursor-pointer inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-violet-600"
      >
        <MessageSquare className="size-5" />
        {commentCount}
      </button>
    </div>
  );
}
