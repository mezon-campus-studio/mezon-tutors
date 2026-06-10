export const vocabularyQueryKey = {
  all: ['vocabulary'] as const,
  list: () => [...vocabularyQueryKey.all, 'list'] as const,
};
