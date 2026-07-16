'use client';

import { ROUTES, type CommunityPostDetailDto } from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { ArrowLeftIcon, Flag, Hash, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ImageAttachmentGallery,
  toImageGalleryItems,
} from '@/components/common/ImageAttachmentGallery';
import { CommunityCommentsDrawer } from '@/components/community/CommunityCommentsDrawer';
import { CommunityEngagementButtons } from '@/components/community/CommunityEngagementSection';
import { CommunityPostTypeBadge } from '@/components/community/CommunityPostTypeBadge';
import { ExerciseSubmissionPanel } from '@/components/community/ExerciseSubmissionPanel';
import { ReportModal } from '@/components/community/ReportModal';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui';
import {
  useCommunityEngagement,
  useCommunityFollowingIds,
  useDeleteCommunityPost,
  useToggleCommunityFollow,
  useToggleCommunityUpvote,
} from '@/services';
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from '@/store';
import { useQueryClient } from '@tanstack/react-query';

type CommunityPostDetailPageProps = {
  post: CommunityPostDetailDto;
};

export default function CommunityPostDetailPage({ post }: CommunityPostDetailPageProps) {
  const t = useTranslations('Community.detail');
  const et = useTranslations('Community.detail.engagement');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const isLoggedIn = isAuthenticated || Boolean(user);

  const commentsParam = useMemo(() => searchParams.get('comments'), [searchParams]);
  const [drawerOpen, setDrawerOpen] = useState(commentsParam === '1');
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (commentsParam === '1') {
      setDrawerOpen(true);
    }
  }, [commentsParam]);

  const { data: engagement } = useCommunityEngagement(
    post.id,
    !isAuthLoading && isLoggedIn,
  );
  const { data: followingIds = [], isLoading: isFollowingLoading } =
    useCommunityFollowingIds(isLoggedIn && !isAuthLoading);
  const toggleUpvote = useToggleCommunityUpvote(post.id);
  const toggleFollow = useToggleCommunityFollow();
  const deletePost = useDeleteCommunityPost();
  const QueryClient = useQueryClient();

  const isMine = user?.id === post.author.id;
  const isFollowing = followingIds.includes(post.author.id);
  const upvoteCount = engagement?.upvoteCount ?? post.upvoteCount;
  const commentCount = engagement?.commentCount ?? post.commentCount;
  const isUpvoted = engagement?.isUpvoted ?? post.isUpvoted ?? false;

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(post.publishedAt)),
    [locale, post.publishedAt],
  );

  const handleUpvote = useCallback(() => {
    if (!isLoggedIn) {
      toast.error(et('loginToInteract'));
      return;
    }
    toggleUpvote.mutate(undefined, {
      onError: () => toast.error(et("upvoteFailed")),
    });
  }, [isLoggedIn, toggleUpvote, et]);

  const handleFollow = useCallback(() => {
    if (!isLoggedIn) {
      toast.error(et('loginToInteract'));
      return;
    }
    toggleFollow.mutate(post.author.id);
  }, [isLoggedIn, toggleFollow, post.author.id, et]);

  const handleDelete = useCallback(() => {
    if (!window.confirm(t("deleteConfirm"))) return;
    deletePost.mutate(post.id, {
      onSuccess: async () => {
        await QueryClient.invalidateQueries({
          queryKey: ["posts"],
        });
        toast.success(t('deleted'));
        router.push(ROUTES.COMMUNITY.INDEX);
      },
      onError: () => toast.error(t('deleteFailed')),
    });
  }, [t, deletePost, post.id, router]);

  const handleBack = () => {
    window.history.back();
  }

  const handleOpenComments = useCallback(() => setDrawerOpen(true), []);

  return (
    <main className="relative min-h-screen bg-[linear-gradient(180deg,#faf9ff_0%,#ffffff_30%)]">
      <div className="relative mx-auto max-w-3xl px-6 py-8 sm:py-12">
        <article>
          <div className='mb-4 flex items-center gap-2 text-sm font-medium cursor-pointer text-slate-500 hover:text-violet-700' onClick={handleBack}>
            <ArrowLeftIcon className='size-4' />
            <span>{t('back')}</span>
          </div>
          <div className='flex justify-between'>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <CommunityPostTypeBadge type={post.type} />
            </div>

            {isMine ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full"
                onClick={handleDelete}
                disabled={deletePost.isPending}
              >
                <Trash2 className="mr-1 size-4" />
                {t('delete')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-full"
                onClick={() => {
                  if (!isLoggedIn) {
                    toast.error(t('engagement.loginToInteract'));
                    return;
                  }
                  setReportOpen(true);
                }}
              >
                <Flag className="mr-1 size-4" />
                {t('report')}
              </Button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-y border-violet-100 py-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <Avatar className="size-9 border border-violet-100">
                  <AvatarImage
                    src={post.author.avatar}
                    alt={post.author.username}
                  />
                  <AvatarFallback>
                    {post.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {t('by', { name: post.author.username })}
              </span>
              <span>{t('publishedAt', { date: dateLabel })}</span>
            </div>
            <div className='flex text-center justify-center gap-4'>
              {!isAuthLoading && !isMine && !isFollowingLoading ? (
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "gradient"}
                  disabled={toggleFollow.isPending}
                  className="rounded-full px-3 py-2"
                >
                  {isFollowing ? t("following") : t("follow")}
                </Button>
              ) : null}
              <CommunityEngagementButtons
                upvoteCount={upvoteCount}
                commentCount={commentCount}
                isUpvoted={isUpvoted}
                isUpvotePending={toggleUpvote.isPending}
                onUpvote={handleUpvote}
                onOpenComments={handleOpenComments}
              />
            </div>
          </div>

          <div className="prose prose-slate mt-8 max-w-none whitespace-pre-wrap text-base leading-8 text-slate-700">
            {post.content}
          </div>

          {post.media.length > 0 ? (
            <div className="mt-6">
              <ImageAttachmentGallery
                images={toImageGalleryItems(
                  post.media.map((m) => ({ url: m.url, public_id: m.id })),
                )}
                previewVisibleCount={post.media.length}
                previewClassName="size-[120px] sm:size-[204px]"
              />
            </div>
          ) : null}

          {post.type === 'EXERCISE' && post.exercise ? (
            <ExerciseSubmissionPanel postId={post.id} exercise={post.exercise} />
          ) : null}

          {post.tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={ROUTES.COMMUNITY.TAG(tag.slug)}
                  className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-sm font-medium text-violet-700 ring-1 ring-violet-100 transition-colors hover:bg-violet-100 hover:text-violet-800"
                >
                  <Hash className="size-3.5" />
                  {tag.name}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between border-t border-violet-100 pt-6">
            <CommunityEngagementButtons
              upvoteCount={upvoteCount}
              commentCount={commentCount}
              isUpvoted={isUpvoted}
              onUpvote={handleUpvote}
              onOpenComments={handleOpenComments}
            />
          </div>
        </article>
      </div>

      <CommunityCommentsDrawer
        postId={post.id}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        postId={post.id}
        onLoginRequired={() => toast.error(t('engagement.loginToInteract'))}
      />
    </main>
  );
}
