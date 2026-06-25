'use client';

import { ROUTES, type BlogPostListItemDto } from '@mezon-tutors/shared';
import { CalendarDays, Clock3, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type BlogArticleCardProps = {
  post: BlogPostListItemDto;
};

export function BlogArticleCard({ post }: BlogArticleCardProps) {
  const t = useTranslations('Blogs.list');
  const locale = useLocale();
  const dateLabel = formatBlogDate(post.publishedAt ?? post.createdAt, locale);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-violet-200">
      <div className="grid min-h-[220px] sm:grid-cols-[260px_1fr]">
        <Link
          href={ROUTES.BLOGS.DETAIL(post.slug)}
          className="relative flex min-h-[220px] items-center justify-center overflow-hidden p-4"
        >
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              fill
              className="object-contain object-center transition-opacity duration-300 group-hover:opacity-90 p-4"
              sizes="260px"
            />
          ) : (
            <div className="size-full bg-[radial-gradient(circle_at_30%_30%,rgba(109,40,217,0.12),transparent_60%),linear-gradient(145deg,#ede9fe,#f5f3ff)]" />
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
                <Link
                  key={tag.id}
                  href={ROUTES.BLOGS.TAG(tag.slug)}
                  className="rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
                >
                  {tag.name}
                </Link>
              ))}
          </div>

          <Link href={ROUTES.BLOGS.DETAIL(post.slug)}>
            <h3 className="line-clamp-2 text-2xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-violet-700">
              {post.title}
            </h3>
          </Link>

          {post.excerpt ? (
            <p className="mt-4 line-clamp-2 text-base leading-7 text-slate-600">{post.excerpt}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" />
              {t('readTime', { minutes: post.readingTime })}
            </span>
            {post.author ? (
              <span className="inline-flex items-center gap-2">
                <User className="size-4" />
                {post.author.username}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function formatBlogDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}
