import type { Metadata } from 'next';
import { ROUTES } from '@mezon-tutors/shared';
import { notFound } from 'next/navigation';
import { createPageMetadata } from '@/lib/seo';
import { getSeoLocale } from '@/lib/seo-messages';
import { fetchBlogTagBySlug, fetchBlogTags, fetchPublishedBlogsByTagSlug } from '@/services';
import BlogTagPage from '@/views/blogs/blog-tag';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function loadBlogTagMeta(locale: string) {
  const file = (await import(`@mezon-tutors/shared/locales/${locale}/blog.json`))
    .default as {
    Blogs: { tag: { meta: { title: string; description: string } } };
  };
  return file.Blogs.tag.meta;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getSeoLocale();
  const meta = await loadBlogTagMeta(locale);
  const tag = await fetchBlogTagBySlug(slug);

  if (!tag) {
    return { title: meta.title };
  }

  return createPageMetadata({
    title: `${tag.name} | ${meta.title}`,
    description: meta.description.replace('{tag}', tag.name),
    path: ROUTES.BLOGS.TAG(slug),
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const [tag, tags, posts] = await Promise.all([
    fetchBlogTagBySlug(slug),
    fetchBlogTags(),
    fetchPublishedBlogsByTagSlug(slug),
  ]);

  if (!tag) {
    notFound();
  }

  return <BlogTagPage tag={tag} tags={tags} posts={posts} />;
}
