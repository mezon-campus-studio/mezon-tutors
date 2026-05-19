export function getAuthDataFromURL(searchParams: URLSearchParams): string | null {
  const urlData = searchParams.get('data');
  return urlData ?? null;
}

export function base64EncodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary);
}
