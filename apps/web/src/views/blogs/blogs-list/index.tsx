'use client';

import {
  ROUTES,
  type BlogListResultDto,
  type BlogListSidebarDto,
  type BlogPostListItemDto,
  type PaginationMeta,
} from '@mezon-tutors/shared';
import {
  ArrowRight,
  Calendar,
  Clock3,
  Flame,
  Loader2,
  Search,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BlogArticleCard } from '@/components/blogs/BlogArticleCard';
import { Button, buttonVariants } from '@/components/ui';
import { cn } from '@/lib/utils';
import { publicApiClient } from '@/services/api-client';

type BlogsListPageProps = {
  featuredPost: BlogPostListItemDto | null;
  sidebar: BlogListSidebarDto;
  latestPosts: BlogPostListItemDto[];
  initialMeta: PaginationMeta;
  initialSearch?: string;
};

export default function BlogsListPage({
  featuredPost,
  sidebar,
  latestPosts,
  initialMeta,
  initialSearch = '',
}: BlogsListPageProps) {
  const t = useTranslations('Blogs.list');
  const locale = useLocale();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const isFirstRender = useRef(true);
  const [loadedPosts, setLoadedPosts] = useState(latestPosts);
  const [page, setPage] = useState(initialMeta?.page ?? 1);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setLoadedPosts(latestPosts);
    setPage(initialMeta?.page ?? 1);
    setMeta(initialMeta);
    setSearchQuery(initialSearch);
  }, [latestPosts, initialMeta, initialSearch]);

  const fetchLatest = useCallback(async (search: string, pageNum: number, append = false) => {
    const params: Record<string, string | number> = {
      page: pageNum,
      limit: 5,
    };
    if (search.trim()) params.search = search.trim();

    const result: BlogListResultDto = await publicApiClient.get('/blog', { params });
    if (!result?.data) return null;

    if (append) {
      setLoadedPosts((prev) => [...prev, ...result.data]);
    } else {
      setLoadedPosts(result.data);
    }
    setPage(pageNum);
    if (result.meta) setMeta(result.meta);
    return result;
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      window.history.replaceState(null, '', newUrl);

      setSearchLoading(true);
      try {
        await fetchLatest(searchQuery, 1, false);
      } catch {
        console.error('Failed to fetch latest posts');
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, pathname, fetchLatest]);

  const loadMore = useCallback(async () => {
    if (loading || !meta?.hasNext) return;
    setLoading(true);
    try {
      await fetchLatest(searchQuery, page + 1, true);
    } catch {
      console.error('Failed to load more posts');
    } finally {
      setLoading(false);
    }
  }, [loading, meta, page, searchQuery, fetchLatest]);

  const hasAnyContent = featuredPost || loadedPosts.length > 0 || sidebar.popularPosts.length > 0;

  return (
    <div className="relative min-h-screen bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-128 bg-[radial-gradient(ellipse_85%_65%_at_50%_-5%,rgba(109,40,217,0.24),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-10 overflow-hidden rounded-[28px] border border-violet-100 bg-[linear-gradient(130deg,#f8f5ff_0%,#ffffff_45%,#f5f3ff_100%)] px-6 py-10 shadow-[0_20px_70px_-45px_rgba(109,40,217,0.45)] sm:px-10 lg:py-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mt-5 text-balance text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Learn Better Every Day
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Discover educational articles, tutoring insights, and practical learning resources
              crafted for students and parents at Mezon Tutors.
            </p>

            <div className="mx-auto mt-9 flex max-w-3xl items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-[0_10px_32px_-20px_rgba(109,40,217,0.4)] transition-all focus-within:border-violet-300 focus-within:shadow-[0_16px_40px_-22px_rgba(109,40,217,0.45)]">
              <Search className="size-5 shrink-0 text-violet-700" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, topics, and resources..."
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
              />
              {searchLoading ? <Loader2 className="size-4 shrink-0 animate-spin text-violet-700" /> : null}
            </div>

            {sidebar.newTopics.length > 0 ? (
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  New topics
                </span>
                {sidebar.newTopics.map((topic) => (
                  <Link
                    key={topic.slug}
                    href={ROUTES.BLOGS.TAG(topic.slug)}
                    className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
                  >
                    {topic.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {featuredPost && !searchQuery ? (
          <section className="mb-10">
            <article className="overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-[0_20px_70px_-42px_rgba(109,40,217,0.35)]">
              <div className="grid gap-0 lg:grid-cols-2">
                <Link
                  href={ROUTES.BLOGS.DETAIL(featuredPost.slug)}
                  className="relative block min-h-[260px]"
                >
                  {featuredPost.coverImageUrl ? (
                    <Image
                      src={featuredPost.coverImageUrl}
                      alt={featuredPost.title}
                      fill
                      className="transition-transform duration-500 hover:scale-105 p-2 rounded-l-4xl"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_35%_35%,rgba(99,102,241,0.16),transparent_60%),linear-gradient(145deg,#eef2ff,#f8f7ff)]" />
                  )}
                </Link>
                <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-12">
                  <span className="mb-4 inline-flex w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700">
                    Featured article
                  </span>
                  <Link href={ROUTES.BLOGS.DETAIL(featuredPost.slug)}>
                    <h2 className="text-balance text-3xl font-black leading-tight text-slate-900 transition-colors hover:text-violet-700 sm:text-4xl">
                      {featuredPost.title}
                    </h2>
                  </Link>
                  {featuredPost.excerpt ? (
                    <p className="mt-4 line-clamp-3 text-base leading-7 text-slate-600">
                      {featuredPost.excerpt}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                    {featuredPost.author ? (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="size-4 text-violet-700" />
                        {featuredPost.author.username}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-4 text-violet-700" />
                      {formatBlogDate(featuredPost.publishedAt ?? featuredPost.createdAt, locale)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-4 text-violet-700" />
                      {t('readTime', { minutes: featuredPost.readingTime })}
                    </span>
                  </div>
                  <Link
                    href={ROUTES.BLOGS.DETAIL(featuredPost.slug)}
                    className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-violet-700 transition-colors hover:text-violet-900"
                  >
                    {t('actions.readMore')}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {!hasAnyContent ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 px-6 py-14 text-center">
            <p className="text-lg font-bold text-slate-900">{t('empty.title')}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {t('empty.description')}
            </p>
            <Link
              href={ROUTES.HOME.index}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'mt-6 rounded-full border-violet-200'
              )}
            >
              {t('backHome')}
            </Link>
          </div>
        ) : (
          <section className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-9">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                  Latest Articles
                </h3>
              </div>

              {loadedPosts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 px-6 py-12 text-center">
                  <p className="text-base font-semibold text-slate-900">{t('empty.title')}</p>
                  <p className="mt-2 text-sm text-slate-500">{t('empty.description')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {loadedPosts.map((post) => (
                    <BlogArticleCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {meta?.hasNext ? (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    className="rounded-full border-violet-200 px-6 font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more articles'
                    )}
                  </Button>
                </div>
              ) : null}
            </div>

            <aside className="hidden lg:col-span-3 lg:block">
              <div className="space-y-5 lg:sticky lg:top-24">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                    <Flame className="size-4 text-violet-700" />
                    Popular Posts
                  </h4>
                  <div className="space-y-3">
                    {sidebar.popularPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={ROUTES.BLOGS.DETAIL(post.slug)}
                        className="block rounded-lg p-2 hover:bg-slate-50"
                      >
                        <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                          {post.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {post.upvotesThisWeek.toLocaleString()} upvotes this week
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 text-base font-bold text-slate-900">Tags</h4>
                  <div className="space-y-2">
                    {sidebar.tags.map((tag) => (
                      <Link
                        key={tag.slug}
                        href={ROUTES.BLOGS.TAG(tag.slug)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50"
                      >
                        <span className="font-medium text-slate-700">{tag.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {tag.count ?? 0}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 text-base font-bold text-slate-900">Trending Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {sidebar.trendingTags.map((tag) => (
                      <Link
                        key={tag.slug}
                        href={ROUTES.BLOGS.TAG(tag.slug)}
                        className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:border-violet-200"
                      >
                        #{tag.name}{' '}
                        <span className="text-violet-700/70">
                          ({(tag.count ?? 0).toLocaleString()} new posts this week)
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </div>
  );
}

function formatBlogDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}
