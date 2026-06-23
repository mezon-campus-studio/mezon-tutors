'use client';

import { ROUTES, type BlogPostListItemDto } from '@mezon-tutors/shared';
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Clock3,
  Flame,
  Search,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui';
import { cn } from '@/lib/utils';

type BlogsListPageProps = {
  posts: (BlogPostListItemDto & {
    upvoteCount?: number;
    upvotesToday?: number;
    upvotesThisWeek?: number;
    commentsToday?: number;
    commentUpvotesToday?: number;
  })[];
};

export default function BlogsListPage({ posts }: BlogsListPageProps) {
  const t = useTranslations('Blogs.list');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);

  const searchedPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => {
      const inTitle = post.title.toLowerCase().includes(query);
      const inExcerpt = (post.excerpt ?? '').toLowerCase().includes(query);
      const inTags = post.tags.some((tag) => tag.name.toLowerCase().includes(query));
      return inTitle || inExcerpt || inTags;
    });
  }, [posts, searchQuery]);

  const featuredPost = [...posts].sort((a, b) => {
    const discussionA = (a.commentsToday ?? 0) + (a.commentUpvotesToday ?? 0);
    const discussionB = (b.commentsToday ?? 0) + (b.commentUpvotesToday ?? 0);
    const discussionDiff = discussionB - discussionA;
    if (discussionDiff !== 0) return discussionDiff;
    const commentDiff = (b.commentsToday ?? 0) - (a.commentsToday ?? 0);
    if (commentDiff !== 0) return commentDiff;
    return (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0);
  })[0];
  const latestPosts = posts.filter((post) => post.id !== featuredPost?.id);
  const searchedLatestPosts = searchedPosts.filter((post) => post.id !== featuredPost?.id);
  const shownPosts = searchedLatestPosts.slice(0, visibleCount);

  const popularPosts = [...posts]
    .sort((a, b) => {
      const weeklyDiff = (b.upvotesThisWeek ?? 0) - (a.upvotesThisWeek ?? 0);
      if (weeklyDiff !== 0) return weeklyDiff;
      return (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0);
    })
    .slice(0, 5);

  const tagCounts = posts.reduce<Record<string, number>>((acc, post) => {
    post.tags.forEach((tag) => {
      acc[tag.name] = (acc[tag.name] ?? 0) + 1;
    });
    return acc;
  }, {});

  const tags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const newTopicDateMap = new Map<string, number>();
  for (const post of posts) {
    const timestamp = new Date(post.createdAt).getTime();
    for (const tag of post.tags) {
      const current = newTopicDateMap.get(tag.name) ?? 0;
      if (timestamp > current) {
        newTopicDateMap.set(tag.name, timestamp);
      }
    }
  }

  const newTopics = [...newTopicDateMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  const dayOfWeek = startOfWeek.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + offset);

  const trendingTagCounts = new Map<string, number>();
  for (const post of posts) {
    const postCreatedAt = new Date(post.createdAt);
    if (postCreatedAt < startOfWeek) continue;
    for (const tag of post.tags) {
      trendingTagCounts.set(tag.name, (trendingTagCounts.get(tag.name) ?? 0) + 1);
    }
  }

  const trendingTags = [...trendingTagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

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
            </div>

            {newTopics.length > 0 ? (
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  New topics
                </span>
                {newTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSearchQuery(topic)}
                    className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {featuredPost ? (
          <section className="mb-10">
            <article className="overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-[0_20px_70px_-42px_rgba(109,40,217,0.35)]">
              <div className="grid gap-0 lg:grid-cols-2">
                <Link
                  href={ROUTES.BLOGS.DETAIL(featuredPost.slug)}
                  className="relative block min-h-[260px] bg-violet-50"
                >
                  {featuredPost.coverImageUrl ? (
                    <Image
                      src={featuredPost.coverImageUrl}
                      alt={featuredPost.title}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
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

        {posts.length === 0 ? (
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
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    Latest Articles
                  </h3>
                </div>
              </div>

              <div className="space-y-6">
              {shownPosts.map((post) => (
                <article
                  key={post.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-violet-200"
                >
                  <div className="grid min-h-[220px] sm:grid-cols-[260px_1fr]">
                    <Link
                      href={ROUTES.BLOGS.DETAIL(post.slug)}
                      className="relative block h-full min-h-[220px] overflow-hidden bg-slate-100"
                    >
                      {post.coverImageUrl ? (
                        <Image
                          src={post.coverImageUrl}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="260px"
                        />
                      ) : (
                        <div className="size-full bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.12),transparent_60%),linear-gradient(145deg,#eef2ff,#f8f7ff)]" />
                      )}
                    </Link>

                    <div className="flex flex-col justify-center p-6 md:p-8">
                      <div className="mb-4 flex flex-wrap gap-2">
                        {(post.tags.length
                          ? post.tags
                          : [{ id: 'general', name: 'General', slug: 'general' }]
                        )
                          .slice(0, 3)
                          .map((tag) => (
                            <span
                              key={tag.id}
                            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-xs font-semibold text-violet-700"
                            >
                              {tag.name}
                            </span>
                          ))}
                      </div>

                      <Link href={ROUTES.BLOGS.DETAIL(post.slug)}>
                        <h3 className="text-2xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-violet-700">
                          {post.title}
                        </h3>
                      </Link>

                      {post.excerpt && (
                        <p className="mt-4 text-base leading-7 text-slate-600">
                          {post.excerpt}
                        </p>
                      )}

                      <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="size-4" />
                          {formatBlogDate(
                            post.publishedAt ?? post.createdAt,
                            locale,
                          )}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="size-4" />
                          {t('readTime', { minutes: post.readingTime })}
                        </span>

                        {post.author && (
                          <span className="inline-flex items-center gap-2">
                            <User className="size-4" />
                            {post.author.username}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

              {visibleCount < searchedLatestPosts.length ? (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    className="rounded-full border-violet-200 px-6 font-semibold text-violet-700 hover:bg-violet-50"
                    onClick={() => setVisibleCount((current) => current + 6)}
                  >
                    Load more articles
                  </Button>
                </div>
              ) : null}
            </div>

            <aside className="lg:col-span-3">
              <div className="space-y-5 lg:sticky lg:top-24">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                    <Flame className="size-4 text-violet-700" />
                    Popular Posts
                  </h4>
                  <div className="space-y-3">
                    {popularPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={ROUTES.BLOGS.DETAIL(post.slug)}
                        className="block rounded-lg p-2 hover:bg-slate-50"
                      >
                        <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                          {post.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(post.upvotesThisWeek ?? 0).toLocaleString()} upvotes this week
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 text-base font-bold text-slate-900">Tags</h4>
                  <div className="space-y-2">
                    {tags.map(([name, count]) => (
                      <button
                        key={name}
                        className="cursor-pointer flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50"
                      >
                        <span className="font-medium text-slate-700">{name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 text-base font-bold text-slate-900">Trending Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {trendingTags.map(([name, count]) => (
                      <button
                        key={name}
                        className="cursor-pointer rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:border-violet-200"
                      >
                        #{name}{' '}
                        <span className="text-violet-700/70">
                          ({count.toLocaleString()} new posts this week)
                        </span>
                      </button>
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
