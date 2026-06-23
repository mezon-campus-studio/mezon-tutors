const API_BASE = process.env.NEXT_PUBLIC_API_ENDPOINT?.replace(/\/$/, '');

type ApiEnvelope<T> = {
  data: T;
  error: unknown;
};

export class ServerApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ServerApiError';
    this.status = status;
  }
}

export async function serverFetch<T>(
  path: string,
  options?: { noStore?: boolean; cacheTime?: number }
): Promise<T | null> {
  if (!API_BASE) return null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...(options?.noStore
        ? { cache: 'no-store' }
        : { next: { revalidate: options?.cacheTime ?? 60 } }),
    } as RequestInit);
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}
