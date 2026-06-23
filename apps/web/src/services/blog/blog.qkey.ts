import { BlogPublishStatusFilter } from "@mezon-tutors/shared";

export const blogQueryKey = {
  all: ["blog"] as const,
  list: () => [...blogQueryKey.all, "list"] as const,
  detail: (slug: string) => [...blogQueryKey.all, "detail", slug] as const,
  mySubmissions: () => [...blogQueryKey.all, "my-submissions"] as const,
  mySubmission: (id: string) => [...blogQueryKey.all, "my-submission", id] as const,
  tags: () => [...blogQueryKey.all, "tags"] as const,
  comments: (slug: string) => [...blogQueryKey.all, "comments", slug] as const,
  engagement: (slug: string) => [...blogQueryKey.all, "engagement", slug] as const,
};

export const adminBlogQueryKey = {
  all: ["admin-blogs"] as const,
  list: (status?: BlogPublishStatusFilter) =>
    [...adminBlogQueryKey.all, "list", status ?? "all"] as const,
  metrics: () => [...adminBlogQueryKey.all, "metrics"] as const,
  detail: (id: string) => [...adminBlogQueryKey.all, "detail", id] as const,
};