"use client";

import { ROUTES, type BlogPostListItemDto } from "@mezon-tutors/shared";
import { ArrowRight, Clock, ImageIcon, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type BlogListRowProps = {
  post: BlogPostListItemDto;
};

export function BlogListRow({ post }: BlogListRowProps) {
  const t = useTranslations("Blogs.list");
  const locale = useLocale();
  const detailHref = ROUTES.BLOGS.DETAIL(post.slug);
  const dateLabel = formatBlogDate(post.publishedAt ?? post.createdAt, locale);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-violet-100/90 bg-white shadow-[0_8px_32px_-24px_rgba(91,33,182,0.2)] transition-all duration-300 hover:border-violet-200 hover:shadow-[0_16px_40px_-20px_rgba(91,33,182,0.28)]">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 to-fuchsia-500 opacity-80"
      />
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        <Link
          href={detailHref}
          className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-violet-50 sm:aspect-[4/3] sm:w-48"
        >
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-violet-300">
              <ImageIcon className="size-10" />
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="space-y-2">
            <Link href={detailHref}>
              <h2 className="text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-violet-800 sm:text-xl">
                {post.title}
              </h2>
            </Link>
            {post.excerpt ? (
              <p className="line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100"
              >
                {tag.name}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {post.author ? (
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3.5 text-violet-500" />
                {post.author.username}
              </span>
            ) : null}
            <span>{dateLabel}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 text-violet-500" />
              {t("readTime", { minutes: post.readingTime })}
            </span>
          </div>

          <div className="mt-auto pt-1">
            <Link href={detailHref}>
              <Button
                variant="outline"
                className={cn(
                  "h-9 rounded-full border-violet-200 px-4 text-xs font-semibold text-violet-700",
                  "hover:border-violet-300 hover:bg-violet-50",
                )}
              >
                {t("actions.readMore")}
                <ArrowRight className="ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function formatBlogDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
