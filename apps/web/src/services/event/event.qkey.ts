export const eventQueryKey = {
  all: ["events"] as const,
  list: () => [...eventQueryKey.all, "list"] as const,
  detail: (slug: string) => [...eventQueryKey.all, "detail", slug] as const,
  mySubmissions: () => [...eventQueryKey.all, "my-submissions"] as const,
  mySubmission: (id: string) => [...eventQueryKey.all, "my-submission", id] as const,
};
