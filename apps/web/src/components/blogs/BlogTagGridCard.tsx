'use client';

import { ROUTES, type BlogPostListItemDto } from '@mezon-tutors/shared';
import { Clock3 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type BlogTagGridCardProps = {
  post: BlogPostListItemDto;
};

export function BlogTagGridCard({ post }: BlogTagGridCardProps) {
  const t = useTranslations('Blogs.list');
  const locale = useLocale();
  const dateLabel = formatBlogDate(post.publishedAt ?? post.createdAt, locale);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_16px_32px_-20px_rgba(109,40,217,0.25)]">
      <Link
        href={ROUTES.BLOGS.DETAIL(post.slug)}
        className="relative block aspect-[16/10] overflow-hidden bg-slate-100"
      >
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="size-full bg-[radial-gradient(circle_at_30%_30%,rgba(109,40,217,0.14),transparent_60%),linear-gradient(145deg,#ede9fe,#f5f3ff)]" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {post.tags[0] ? (
          <Link
            href={ROUTES.BLOGS.TAG(post.tags[0].slug)}
            className="mb-3 inline-flex w-fit rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
          >
            {post.tags[0].name}
          </Link>
        ) : null}

        <Link href={ROUTES.BLOGS.DETAIL(post.slug)} className="flex-1">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-violet-700">
            {post.title}
          </h3>
          {post.excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
          ) : null}
        </Link>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>{dateLabel}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {t('readTime', { minutes: post.readingTime })}
          </span>
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
