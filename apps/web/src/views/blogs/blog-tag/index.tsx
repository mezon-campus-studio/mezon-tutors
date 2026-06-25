'use client';

import { ROUTES, type BlogPostListItemDto, type BlogTagListItemDto } from '@mezon-tutors/shared';
import { ArrowLeft, BookOpen, Clock3, Heart } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { BlogTagGridCard } from '@/components/blogs/BlogTagGridCard';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type BlogTagPageProps = {
  tag: BlogTagListItemDto;
  tags: BlogTagListItemDto[];
  posts: BlogPostListItemDto[];
};

export default function BlogTagPage({ tag, tags, posts }: BlogTagPageProps) {
  const t = useTranslations('Blogs.tag');
  const [visibleCount, setVisibleCount] = useState(9);
  const shownPosts = posts.slice(0, visibleCount);

  const stats = useMemo(() => {
    const totalUpvotes = posts.reduce((sum, post) => sum + (post.upvoteCount ?? 0), 0);
    const avgReadTime =
      posts.length > 0
        ? Math.round(posts.reduce((sum, post) => sum + post.readingTime, 0) / posts.length)
        : 0;

    return { totalUpvotes, avgReadTime };
  }, [posts]);

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name)),
    [tags],
  );

  return (
    <div className="relative min-h-screen bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_85%_65%_at_50%_-5%,rgba(109,40,217,0.18),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          href={ROUTES.BLOGS.INDEX}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>

        <section className="mb-8">
          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full gap-2 px-0.5">
              {sortedTags.map((item) => {
                const isActive = item.slug === tag.slug;
                return (
                  <Link
                    key={item.id}
                    href={ROUTES.BLOGS.TAG(item.slug)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                      isActive
                        ? 'border-violet-700 bg-violet-700 text-white shadow-[0_8px_20px_-12px_rgba(109,40,217,0.65)]'
                        : 'border-violet-100 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700',
                    )}
                  >
                    <span>{item.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {item.postCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <header className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{tag.name}</h1>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <StatPill
              icon={<BookOpen className="size-4 text-violet-700" />}
              label={t('stats.posts', { count: posts.length })}
            />
            <StatPill
              icon={<Clock3 className="size-4 text-violet-700" />}
              label={t('stats.avgReadTime', { minutes: stats.avgReadTime })}
            />
            <StatPill
              icon={<Heart className="size-4 text-violet-700" />}
              label={t('stats.upvotes', { count: stats.totalUpvotes })}
            />
          </div>
        </header>

        <div className="mb-10 border-t border-slate-200" />

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 px-6 py-14 text-center">
            <p className="text-lg font-bold text-slate-900">{t('empty.title')}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shownPosts.map((post) => (
                <BlogTagGridCard key={post.id} post={post} />
              ))}
            </div>

            {visibleCount < posts.length ? (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-full border-violet-200 px-6 font-semibold text-violet-700 hover:bg-violet-50"
                  onClick={() => setVisibleCount((current) => current + 9)}
                >
                  {t('loadMore')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/60 px-4 py-2 text-sm font-medium text-slate-700">
      {icon}
      <span>{label}</span>
    </div>
  );
}
