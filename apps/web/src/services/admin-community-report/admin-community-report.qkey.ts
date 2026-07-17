export const adminCommunityReportQueryKey = {
  all: ['admin', 'community-reports'] as const,
  list: (status?: string) =>
    [...adminCommunityReportQueryKey.all, 'list', status ?? 'all'] as const,
};
