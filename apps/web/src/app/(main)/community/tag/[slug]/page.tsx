import type { Metadata } from 'next';
import { ROUTES } from '@mezon-tutors/shared';
import { notFound } from 'next/navigation';
import { createPageMetadata } from '@/lib/seo';
import { getSeoLocale } from '@/lib/seo-messages';
import { fetchCommunityTagBySlug, fetchCommunityTags, fetchCommunityFeed } from '@/services';
import CommunityTagPage from '@/views/community/community-tag';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function loadMeta(locale: string) {
  const file = (await import(`@mezon-tutors/shared/locales/${locale}/community.json`))
    .default as { Community: { tag: { meta: { title: string; description: string } } } };
  return file.Community.tag.meta;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getSeoLocale();
  const meta = await loadMeta(locale);
  const tag = await fetchCommunityTagBySlug(slug);

  if (!tag) {
    return { title: meta.title };
  }

  return createPageMetadata({
    title: `${tag.name} | ${meta.title}`,
    description: meta.description.replace('{tag}', tag.name),
    path: ROUTES.COMMUNITY.TAG(slug),
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const [tag, tags, feed] = await Promise.all([
    fetchCommunityTagBySlug(slug),
    fetchCommunityTags(),
    fetchCommunityFeed({ tag: slug, sort: 'latest', limit: 50 }),
  ]);

  if (!tag) {
    notFound();
  }

  return <CommunityTagPage tag={tag} tags={tags} posts={feed.data} />;
}
