export async function restoreOrAuthenticateMezonLightClient<T>(
  restore: () => Promise<T | null>,
  authenticate: () => Promise<T | null>,
): Promise<T | null> {
  const restoredClient = await restore();
  if (restoredClient) {
    return restoredClient;
  }

  return authenticate();
}

export function canCommitMezonLightInitialization(options: {
  initializationIsCurrent: boolean;
  expectedUserId: string | null | undefined;
  currentUserId: string | null | undefined;
  clientUserId: string | null | undefined;
}): boolean {
  const { initializationIsCurrent, expectedUserId, currentUserId, clientUserId } = options;
  return Boolean(
    initializationIsCurrent &&
      expectedUserId &&
      currentUserId === expectedUserId &&
      clientUserId === expectedUserId,
  );
}
