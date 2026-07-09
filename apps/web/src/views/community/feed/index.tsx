'use client';

import {
  ROUTES,
  type CommunityFeedSort,
  type CommunityPostListItemDto,
  type CommunityPostType,
} from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { Loader2, PenLine } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommunityCreatePostButtons } from '@/components/community/CommunityCreatePostButtons';
import { CommunityCreatePostModal } from '@/components/community/CommunityCreatePostModal';
import { CommunityFeedToolbar, getActiveTabFromParams } from '@/components/community/CommunityFeedToolbar';
import type { CommunityFeedTab } from '@/components/community/CommunityFeedToolbar';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { CommunitySearchModal } from '@/components/community/CommunitySearchModal';
import { Avatar, AvatarFallback, AvatarImage, Button, toast } from '@/components/ui';
import { useCommunityFeed } from '@/services';
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from '@/store';

type CommunityFeedPageProps = {
  initialPosts: CommunityPostListItemDto[];
  initialCursor: string | null;
  initialHasMore: boolean;
};

export default function CommunityFeedPage({
  initialPosts,
  initialHasMore,
}: CommunityFeedPageProps) {
  const t = useTranslations('Community.feed');
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAtomValue(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isLoggedIn = isAuthenticated || Boolean(user);

  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1');
  const [createType, setCreateType] = useState<CommunityPostType>('POST');

  const sort = (searchParams.get('sort') as CommunityFeedSort) || 'latest';
  const typeParam = searchParams.get('type') as CommunityPostType | null;
  const feedParam = searchParams.get('feed');
  const activeTab = feedParam === 'following' ? 'following' : getActiveTabFromParams(typeParam);

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    if (isAuthLoading) return;
    if (!isLoggedIn) {
      router.replace(
        `/?login=required&next=${encodeURIComponent(`${ROUTES.COMMUNITY.INDEX}?create=1`)}`,
      );
      return;
    }
    setCreateOpen(true);
  }, [searchParams, isAuthLoading, isLoggedIn, router]);

  const isFollowingTab = activeTab === 'following';
  const feedQuery = useCommunityFeed(
    {
      sort,
      type: isFollowingTab ? undefined : (typeParam ?? undefined),
      following: isFollowingTab || undefined,
      limit: 10,
    },
  );

  const posts = useMemo(() => {
    if (feedQuery.data?.pages?.length) {
      return feedQuery.data.pages.flatMap((p) => p.data);
    }
    return initialPosts;
  }, [feedQuery.data, initialPosts]);

  const hasMore = feedQuery.hasNextPage ?? initialHasMore;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      router.replace(qs ? `${ROUTES.COMMUNITY.INDEX}?${qs}` : ROUTES.COMMUNITY.INDEX);
    },
    [router, searchParams],
  );

  const handleTabChange = (tab: CommunityFeedTab, type?: CommunityPostType) => {
    if (tab === 'following') {
      updateParams({ type: null, feed: 'following' });
    } else {
      updateParams({ type: type ?? null, feed: null });
    }
  };

  const handleSearchOpen = () => setSearchOpen(true);

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open && searchParams.get('create')) {
      updateParams({ create: null });
    }
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || 'User'
    : '';

  const handleCreateClick = (type?: CommunityPostType) => {
    if (isAuthLoading) return;
    if (!isLoggedIn) {
      toast.error(t('loginRequired'));
      return;
    }
    setCreateType(type ?? 'POST');
    setCreateOpen(true);
  };

  const loadMore = () => {
    feedQuery.fetchNextPage();
  };

  return (
    <div className="min-h-screen bg-muted">
      <CommunityFeedToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSearchOpen={handleSearchOpen}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 my-6 ">
        <div className="flex items-start gap-8">
          <div className="min-w-0 flex-1 rounded-lg bg-white p-4">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-24">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-neutral-100">
                  <PenLine className="size-7 text-primary" />
                </div>
                <p className="text-base font-semibold text-neutral-900">{t('empty.title')}</p>
                <p className="mt-1.5 max-w-xs text-center text-sm text-neutral-500">{t('empty.description')}</p>
              </div>
            ) : (
              <div className="bg-white">
                {posts.map((post) => (
                  <CommunityPostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {hasMore ? (
              <div className="pt-3 text-center border-t border-neutral-200">
                <Button
                  variant="ghost"
                  className="text-neutral-600 rounded-full"
                  onClick={loadMore}
                  disabled={feedQuery.isFetchingNextPage}
                >
                  {feedQuery.isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    t('loadMore')
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-20">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-3 pb-4">
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={user?.avatar ?? undefined} alt="" />
                    <AvatarFallback className="bg-violet-500 text-sm font-semibold text-white">
                      {displayName ? displayName[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold text-neutral-900">
                    {t('createPost')}
                  </p>
                </div>
                <div className="mb-3 border-t border-neutral-100" />
                <CommunityCreatePostButtons onSelect={handleCreateClick} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <CommunityCreatePostModal
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        defaultType={createType}
      />

      <CommunitySearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </div>
  );
}
