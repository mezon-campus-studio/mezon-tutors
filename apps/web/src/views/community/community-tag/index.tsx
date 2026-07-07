'use client';

import { ROUTES, type CommunityPostListItemDto, type CommunityTagListItemDto } from '@mezon-tutors/shared';
import { ArrowLeft, Hash } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';

type CommunityTagPageProps = {
  tag: CommunityTagListItemDto;
  posts: CommunityPostListItemDto[];
};

export default function CommunityTagPage({ tag, posts }: CommunityTagPageProps) {
  const t = useTranslations('Community.tag');

  return (
    <div className="relative min-h-screen bg-muted">
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <Link
          href={ROUTES.COMMUNITY.INDEX}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>

        <header className="mb-6 ml-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-violet-700">
            <Hash className="size-6 text-violet-500" />
            {tag.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('count', { count: posts.length })}
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 px-6 py-14 text-center">
            <p className="text-lg font-bold text-slate-900">{t('empty.title')}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 rounded-xl px-4 bg-white">
            {posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
