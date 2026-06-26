export const learningLogQueryKey = {
  all: ['learningLog'] as const,
  heatmap: (months?: number) => [...learningLogQueryKey.all, 'heatmap', months] as const,
};
