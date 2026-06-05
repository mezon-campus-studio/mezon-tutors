import { BASE_URL } from "@/services/api-client";

/**
 * Fetches a backend-proxied file with JWT and opens it in a new browser tab.
 * Uses a blob URL so the Cloudinary URL is never exposed.
 */
export async function openSecureProxyInNewTab(
  proxyPath: string,
  token: string | null,
): Promise<boolean> {
  if (!token?.trim()) return false;

  const res = await fetch(`${BASE_URL}${proxyPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    return false;
  }

  // Keep blob alive while the new tab loads; revoke after a delay.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  return true;
}
