'use client';

import { ROUTES, type BlogPostDetailDto } from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { ArrowLeft, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { BlogCommentsDrawer } from '@/components/blogs/BlogCommentsDrawer';
import { BlogContentHtml } from '@/components/blogs/BlogContentHtml';
import { EngagementButtons } from '@/components/blogs/BlogEngagementSection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
import { useBlogEngagement, useToggleBlogUpvote } from '@/services/blog/blog.api';
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from '@/store';

type BlogDetailPageProps = {
  post: BlogPostDetailDto;
};

export default function BlogDetailPage({ post }: BlogDetailPageProps) {
  const t = useTranslations('Blogs.detail');
  const et = useTranslations('Blogs.detail.engagement');
  const locale = useLocale();
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const isLoggedIn = isAuthenticated || Boolean(user);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: engagement } = useBlogEngagement(post.slug, !isAuthLoading && isLoggedIn);
  const toggleUpvote = useToggleBlogUpvote(post.slug);

  const upvoteCount = engagement?.upvoteCount ?? post.upvoteCount;
  const commentCount = engagement?.commentCount ?? post.commentCount;
  const isUpvoted = engagement?.isUpvoted ?? false;

  const publishedLabel = formatBlogDate(post.publishedAt ?? post.createdAt, locale);

  const handleUpvote = () => {
    if (!isLoggedIn) {
      toast.error(et("loginToInteract"));
      return;
    }
    toggleUpvote.mutate(undefined, {
      onError: () => toast.error(et('upvoteFailed')),
    });
  };

  return (
    <main className="relative min-h-screen bg-[linear-gradient(180deg,#faf9ff_0%,#ffffff_30%,#ffffff_100%)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(124,58,237,0.12),transparent)]"
        aria-hidden
      />

      <article className="relative mx-auto max-w-3xl px-6 py-8 sm:py-12 lg:px-8">
        <Link
          href={ROUTES.BLOGS.INDEX}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>

        <header className="space-y-5">
          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={ROUTES.BLOGS.TAG(tag.slug)}
                  className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100 transition-colors hover:bg-violet-100"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          ) : null}

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl sm:leading-tight">
            {post.title}
          </h1>

          {post.excerpt ? <p className="text-lg leading-8 text-slate-600">{post.excerpt}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-y border-violet-100 py-4 text-sm text-slate-500">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {post.author ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <Avatar className="size-10 border border-violet-100">
                    <AvatarImage src={post.author.avatar} alt={post.author.username} />
                    <AvatarFallback className="text-[10px] font-semibold">
                      {post.author.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {post.author.username}
                </span>
              ) : null}
              <span>{t('publishedAt', { date: publishedLabel })}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-violet-500" />
                {t('readTime', { minutes: post.readingTime })}
              </span>
            </div>
            <EngagementButtons
              upvoteCount={upvoteCount}
              commentCount={commentCount}
              isUpvoted={isUpvoted}
              isPending={toggleUpvote.isPending}
              onUpvote={handleUpvote}
              onOpenComments={() => setDrawerOpen(true)}
            />
          </div>
        </header>

        {post.coverImageUrl ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 shadow-lg shadow-violet-100/50">
            <Image
              src={post.coverImageUrl}
              alt=""
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto"
              priority
            />
          </div>
        ) : null}

        <BlogContentHtml
          content={post.content}
          className="mt-10"
        />

        <div className="mt-10 flex items-center justify-between border-t border-violet-100 pt-6">
          <EngagementButtons
            upvoteCount={upvoteCount}
            commentCount={commentCount}
            isUpvoted={isUpvoted}
            isPending={toggleUpvote.isPending}
            onUpvote={handleUpvote}
            onOpenComments={() => setDrawerOpen(true)}
          />
        </div>
      </article>

      <BlogCommentsDrawer
        slug={post.slug}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </main>
  );
}

function formatBlogDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}
