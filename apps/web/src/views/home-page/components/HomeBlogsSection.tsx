"use client";

import { ROUTES } from "@mezon-tutors/shared";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlogTagGridCard } from "@/components/blogs/BlogTagGridCard";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { usePublishedBlogs } from "@/services";

const HOME_BLOG_PREVIEW_LIMIT = 3;

export default function HomeBlogsSection() {
  const t = useTranslations("Home.Blogs");
  const { data, isPending, isError } = usePublishedBlogs(
    { page: 1, limit: HOME_BLOG_PREVIEW_LIMIT },
    true,
  );

  const posts = data?.data?.slice(0, HOME_BLOG_PREVIEW_LIMIT) ?? [];

  if (isPending || isError || posts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-violet-100/60 bg-[linear-gradient(180deg,#ffffff_0%,#faf8ff_100%)] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="mx-auto max-w-2xl space-y-3 text-center md:mx-0 md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <BookOpen className="size-3.5" />
              {t("badge")}
            </span>
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              {t("title")}
            </h2>
            <p className="text-slate-600">{t("description")}</p>
          </div>
          <Link href={ROUTES.BLOGS.INDEX} className="mx-auto md:mx-0">
            <Button
              variant="gradient"
              className="h-10 w-fit rounded-full px-5 text-sm font-semibold"
            >
              {t("viewAll")}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        <div
          className={cn(
            "hidden lg:grid lg:justify-center lg:gap-6",
            posts.length === 1 && "lg:grid-cols-1 lg:max-w-xl lg:mx-auto",
            posts.length === 2 && "lg:grid-cols-2 lg:max-w-5xl lg:mx-auto",
            posts.length >= 3 && "lg:grid-cols-3",
          )}
        >
          {posts.map((post) => (
            <BlogTagGridCard key={post.id} post={post} />
          ))}
        </div>

        <div className="lg:hidden">
          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {posts.map((post) => (
              <div
                key={post.id}
                className="w-[min(78vw,18rem)] shrink-0 snap-center"
              >
                <BlogTagGridCard post={post} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
