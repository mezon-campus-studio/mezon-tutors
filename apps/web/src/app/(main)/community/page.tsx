import type { Metadata } from 'next';
import { ROUTES, type CommunityFeedSort, type CommunityPostType } from '@mezon-tutors/shared';
import { createPageMetadata } from '@/lib/seo';
import { getSeoLocale } from '@/lib/seo-messages';
import { fetchCommunityFeed } from '@/services';
import CommunityFeedPage from '@/views/community/feed';

async function loadMeta(locale: string) {
  const file = (await import(`@mezon-tutors/shared/locales/${locale}/community.json`))
    .default as { Community: { meta: { title: string; description: string } } };
  return file.Community.meta;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSeoLocale();
  const meta = await loadMeta(locale);
  return createPageMetadata({
    title: meta.title,
    description: meta.description,
    path: ROUTES.COMMUNITY.INDEX,
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const feed = await fetchCommunityFeed({
    sort: (params.sort as CommunityFeedSort) ?? 'latest',
    type: (params.type as CommunityPostType) ?? undefined,
    limit: 10,
  });
  return (
    <CommunityFeedPage
      initialPosts={feed.data}
      initialCursor={feed.meta.nextCursor}
      initialHasMore={feed.meta.hasMore}
    />
  );
}
