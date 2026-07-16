'use client';

import { useState } from 'react';
import { ROUTES, type CommunityPostListItemDto } from '@mezon-tutors/shared';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import {
  ArrowBigUp,
  Dumbbell,
  FileEdit,
  Flag,
  Hash,
  HelpCircle,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import {
  ImageAttachmentGallery,
  toImageGalleryItems,
} from '@/components/common/ImageAttachmentGallery';
import { ActionMenu } from '@/components/common/ActionMenu';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useCommunityPost, useMyCommunitySubmissions, useToggleCommunityUpvote } from '@/services';
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from '@/store';
import { ExerciseSubmissionPanel } from './ExerciseSubmissionPanel';
import { ReportModal } from './ReportModal';

type CommunityPostCardProps = {
  post: CommunityPostListItemDto;
  className?: string;
};

const MAX_PREVIEW_VISIBLE = 3;

const TYPE_CONFIG = {
  POST: {
    icon: <FileEdit className="size-4 stroke-[2.5]" />,
    bg: 'bg-blue-100',
    fg: 'text-blue-600',
  },
  EXERCISE: {
    icon: <Dumbbell className="size-4 stroke-[2.5]" />,
    bg: 'bg-emerald-100',
    fg: 'text-emerald-600',
  },
  QUESTION: {
    icon: <HelpCircle className="size-4 stroke-[2.5]" />,
    bg: 'bg-purple-100',
    fg: 'text-purple-600',
  },
} as const;

const AVATAR_ACCENT = [
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
];

function getAvatarAccent(username: string) {
  const code = username.charCodeAt(0) || 0;
  return AVATAR_ACCENT[code % AVATAR_ACCENT.length];
}

function formatRelativeTime(iso: string, locale: string) {
  return formatDistanceToNow(new Date(iso), {
    addSuffix: true,
    locale: locale === 'vi' ? vi : enUS,
  });
}

export function CommunityPostCard({ post, className }: CommunityPostCardProps) {
  const locale = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isLongContent = post.content.length > 200;
  const isExercise = post.type === "EXERCISE";
  const accent = getAvatarAccent(post.author.username);
  const typeConfig = TYPE_CONFIG[post.type];
  const toggleUpvote = useToggleCommunityUpvote(post.id);
  const correctCount = post.correctCount;
  const incorrectCount = post.incorrectCount;
  const difficultyLabel =
    isExercise && post.exercise?.difficulty
      ? post.exercise.difficulty.charAt(0).toUpperCase() +
        post.exercise.difficulty.slice(1).toLowerCase()
      : null;

  const exerciseCardBg =
    post.mySubmissionResult === 'correct'
      ? 'bg-emerald-50 border-emerald-100'
      : post.mySubmissionResult === 'incorrect'
        ? 'bg-red-50 border-red-100'
        : 'bg-neutral-100 border-neutral-100';

  const handleCardClick = () => {
    router.push(ROUTES.COMMUNITY.DETAIL(post.id));
  };

  return (
    <article
      className={cn('cursor-pointer border-b border-neutral-200 last:border-b-0', className)}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
    >
      <div className="px-1 py-5 sm:px-2">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0">
            <AvatarImage src={post.author.avatar} alt={post.author.username} />
            <AvatarFallback className={cn('text-xs font-semibold', accent)}>
              {post.author.username.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-[15px] font-semibold text-neutral-900">
            {post.author.username}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                typeConfig.bg,
                typeConfig.fg,
              )}
            >
              {typeConfig.icon}
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <ActionMenu
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-8 text-neutral-400 hover:text-neutral-700"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
                items={[
                  {
                    label: "Report",
                    icon: <Flag className="size-4" />,
                    variant: "destructive",
                    onClick: (e) => {
                      e.stopPropagation()
                      setReportOpen(true)
                    },
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p
            className={cn(
              'whitespace-pre-line text-[15px] leading-7 text-neutral-600',
              !expanded && 'line-clamp-5',
            )}
          >
            {post.content}
          </p>
          {isLongContent && !expanded ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(true);
              }}
              className="mt-1 cursor-pointer text-sm font-medium text-primary hover:underline"
            >
              Read more
            </button>
          ) : null}
        </div>

        {isExercise ? (
          <Link
            href={ROUTES.COMMUNITY.DETAIL(post.id)}
            onClick={(e) => e.stopPropagation()}
            className={cn("mt-3 block rounded-xl border p-3 text-sm transition-colors hover:opacity-80", exerciseCardBg)}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-violet-700">
                <Dumbbell className="size-4 shrink-0" />
                {difficultyLabel || "Exercise"}
              </span>
              <span className="text-xs font-semibold text-violet-700">
                {post.submissionCount}
              </span>
            </div>
            {post.submissionCount > 0 ? (
              <>
                <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-neutral-200/60">
                  {correctCount != null && incorrectCount != null ? (
                    <>
                      {(correctCount / (correctCount + incorrectCount)) * 100 >
                      0 ? (
                        <div
                          className="h-full rounded-l-full bg-emerald-500 transition-all"
                          style={{
                            width: `${(correctCount / (correctCount + incorrectCount)) * 100}%`,
                          }}
                        />
                      ) : null}
                      {incorrectCount > 0 ? (
                        <div
                          className={cn(
                            "h-full bg-red-400 transition-all",
                            correctCount > 0 ? "rounded-r-full" : "rounded-full",
                          )}
                          style={{
                            width: `${(incorrectCount / (correctCount + incorrectCount)) * 100}%`,
                          }}
                        />
                      ) : null}
                    </>
                  ) : (
                    <div className="h-full w-full rounded-full transition-all" />
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-emerald-500">
                    {correctCount != null &&
                    (correctCount + (incorrectCount ?? 0)) > 0
                      ? Math.round(
                          (correctCount /
                            (correctCount + (incorrectCount ?? 0))) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                  <span className="font-medium text-red-500">
                    {incorrectCount != null &&
                    ((correctCount ?? 0) + incorrectCount) > 0
                      ? Math.round(
                          (incorrectCount /
                            ((correctCount ?? 0) + incorrectCount)) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </>
            ) : null}
          </Link>
        ) : null}

        {post.media.length > 0 ? (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ImageAttachmentGallery
              images={toImageGalleryItems(
                post.media.map((m) => ({ url: m.url, public_id: m.id })),
              )}
              previewVisibleCount={MAX_PREVIEW_VISIBLE}
              previewClassName="size-[114px] sm:size-[204px]"
            />
          </div>
        ) : null}

        {post.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                href={ROUTES.COMMUNITY.TAG(tag.slug)}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-100 transition-colors hover:bg-violet-100 hover:text-violet-800"
              >
                <Hash className="size-3" />
                {tag.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-sm text-neutral-400">
          <time dateTime={post.publishedAt}>
            {formatRelativeTime(post.publishedAt, locale)}
          </time>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`${ROUTES.COMMUNITY.DETAIL(post.id)}?comments=1`);
              }}
              className="inline-flex items-center gap-1.5 text-neutral-400 transition-colors cursor-pointer hover:text-primary"
            >
              <MessageSquare className="size-5 stroke-[1.75]" aria-hidden />
              <span className="text-sm font-medium">{post.commentCount}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleUpvote.mutate();
              }}
              className={cn(
                "inline-flex items-center gap-1.5 transition-colors cursor-pointer",
                post.isUpvoted
                  ? "text-brand"
                  : "text-neutral-400 hover:text-primary",
              )}
            >
              <ArrowBigUp
                className={cn(
                  "size-5 stroke-[1.75]",
                  post.isUpvoted && "fill-current text-primary",
                )}
                aria-hidden
              />
              <span
                className="text-sm font-medium"
                style={{
                  color: post.isUpvoted
                    ? "var(--primary)"
                    : "var(--neutral-400)",
                }}
              >
                {post.upvoteCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        postId={post.id}
        onLoginRequired={() => toast.error("Please login to report")}
      />
    </article>
  );
}
