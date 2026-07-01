"use client";

import { ROUTES } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { BookOpen, ExternalLink, Pencil, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button, Spinner } from "@/components/ui";
import { useMyBlogSubmissions } from "@/services";

const STATUS_STYLES: Record<
  string,
  { badge: string; card: string; dot: string }
> = {
  PENDING: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    card: "border-amber-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)]",
    dot: "bg-amber-400",
  },
  PUBLISHED: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    card: "border-emerald-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff9_100%)]",
    dot: "bg-emerald-400",
  },
  REJECTED: {
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    card: "border-rose-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff6f7_100%)]",
    dot: "bg-rose-400",
  },
  CLOSED: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    card: "border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]",
    dot: "bg-slate-400",
  },
};

export default function MyBlogsView() {
  const t = useTranslations("Blogs.my");
  const { data: posts = [], isLoading } = useMyBlogSubmissions();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1320px] space-y-6 px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.2em] text-violet-600 uppercase">
              Blog
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">{t("description")}</p>
          </div>
          <Link href={ROUTES.BLOGS.CREATE} className="shrink-0">
            <Button
              variant="gradient"
              className="h-11 rounded-full px-6 text-sm font-semibold shadow-lg shadow-violet-300/30"
            >
              <Plus className="mr-2 size-4" />
              {t("create")}
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Spinner className="size-8 text-violet-600" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-lg shadow-violet-300/40">
              <Sparkles className="size-7" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">{t("empty.title")}</h2>
            <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
              {t("empty.description")}
            </p>
            <Link href={ROUTES.BLOGS.CREATE} className="mt-6">
              <Button
                variant="gradient"
                className="h-11 rounded-full px-8 text-sm font-semibold shadow-lg shadow-violet-300/30"
              >
                <Plus className="mr-2 size-4" />
                {t("create")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const statusStyle = STATUS_STYLES[post.publishStatus] ?? STATUS_STYLES.PENDING;
              const canEdit =
                post.publishStatus === "PENDING" ||
                post.publishStatus === "REJECTED" ||
                post.publishStatus === "PUBLISHED";

              return (
                <article
                  key={post.id}
                  className={`overflow-hidden rounded-2xl border shadow-sm shadow-violet-100/20 ${statusStyle.card}`}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-violet-100/80">
                      {post.coverImageUrl ? (
                        <Image
                          src={post.coverImageUrl}
                          alt={post.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-violet-300">
                          <BookOpen className="size-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`size-2 shrink-0 rounded-full ${statusStyle.dot}`}
                          aria-hidden
                        />
                        <h2 className="truncate text-base font-bold text-slate-900">
                          {post.title}
                        </h2>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${statusStyle.badge}`}
                        >
                          {t(`status.${post.publishStatus}`)}
                        </Badge>
                        {post.updateReviewStatus === "PENDING" ? (
                          <Badge
                            variant="outline"
                            className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
                          >
                            {t("status.UPDATE_PENDING")}
                          </Badge>
                        ) : null}
                      </div>

                      {post.excerpt ? (
                        <p className="line-clamp-2 text-sm text-slate-600">{post.excerpt}</p>
                      ) : null}

                      <p className="text-xs text-slate-500">
                        {dayjs(post.createdAt).format("DD/MM/YYYY")}
                      </p>

                      {post.publishStatus === "REJECTED" && post.rejectedReason ? (
                        <p className="rounded-xl bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700 ring-1 ring-rose-100">
                          {post.rejectedReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                      {post.publishStatus === "PUBLISHED" ? (
                        <Link href={ROUTES.BLOGS.DETAIL(post.slug)}>
                          <Button
                            variant="outline"
                            className="h-10 w-full rounded-full border-violet-200 text-violet-700 hover:bg-violet-50"
                          >
                            <ExternalLink className="mr-2 size-4" />
                            {t("actions.view")}
                          </Button>
                        </Link>
                      ) : null}
                      {canEdit ? (
                        <Link href={ROUTES.BLOGS.EDIT(post.id)}>
                          <Button
                            variant="gradient"
                            className="h-10 w-full rounded-full px-5 text-sm font-semibold shadow-md shadow-violet-300/25"
                          >
                            <Pencil className="mr-2 size-4" />
                            {t("actions.edit")}
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
