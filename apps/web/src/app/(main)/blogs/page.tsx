import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoLocale } from "@/lib/seo-messages";
import BlogsListPage from "@/views/blogs/blogs-list";
import { fetchPublishedBlogs } from "@/services";

async function loadBlogsListMeta(locale: string) {
  const file = (await import(`@mezon-tutors/shared/locales/${locale}/blog.json`))
    .default as {
    Blogs: { list: { meta: { title: string; description: string } } };
  };
  return file.Blogs.list.meta;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSeoLocale();
  const meta = await loadBlogsListMeta(locale);
  return createPageMetadata({
    title: meta.title,
    description: meta.description,
    path: ROUTES.BLOGS.INDEX,
  });
}

export default async function Page() {
  const posts = await fetchPublishedBlogs();
  return <BlogsListPage posts={posts} />;
}
