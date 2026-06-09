import {
  isInlineViewableContentType,
  isInlineViewableFormat,
  parseContentDispositionFilename,
  resolveEffectiveFormat,
  resolveSecureDocumentOpenUrl,
  type SecurePrivateViewLink,
} from '@mezon-tutors/shared';
import { apiClient, BASE_URL } from '@/services/api-client';

type OpenAdminSecureDocumentOptions = {
  /** Backend proxy path for authenticated fetch with correct filename headers. */
  proxyPath?: string;
};

function triggerBlobDownload(blob: Blob, fileName: string): boolean {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return true;
}

function openBlobInNewTab(blob: Blob): boolean {
  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    return false;
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  return true;
}

async function openViaProxy(
  proxyPath: string,
  token: string,
  link: SecurePrivateViewLink,
): Promise<boolean> {
  const res = await fetch(`${BASE_URL}${proxyPath}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return false;

  const fileName =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ||
    link.fileName ||
    'document';
  const effectiveFormat = resolveEffectiveFormat(link.format ?? '', fileName);
  const blob = await res.blob();

  if (['doc', 'docx'].includes(effectiveFormat)) {
    return triggerBlobDownload(blob, fileName);
  }

  if (
    isInlineViewableFormat(effectiveFormat) ||
    isInlineViewableContentType(link.contentType)
  ) {
    return openBlobInNewTab(blob);
  }

  return triggerBlobDownload(blob, fileName);
}

/**
 * Admin-only: fetches a short-lived signed view link (JWT required), then opens the
 * document in a new tab. Uses the authenticated proxy so downloads keep the original
 * filename and extension.
 */
export async function openAdminSecureDocument(
  viewLinkPath: string,
  token: string | null,
  options?: OpenAdminSecureDocumentOptions,
): Promise<boolean> {
  if (!token?.trim()) return false;

  try {
    const link = await apiClient.get<SecurePrivateViewLink>(viewLinkPath);
    if (!link?.openUrl) return false;

    if (options?.proxyPath) {
      return openViaProxy(options.proxyPath, token, link);
    }

    const urlToOpen = resolveSecureDocumentOpenUrl(link);
    const opened = window.open(urlToOpen, '_blank', 'noopener,noreferrer');
    return !!opened;
  } catch {
    return false;
  }
}

/** @deprecated Use openAdminSecureDocument with a `/view-link` admin path instead. */
export async function openSecureProxyInNewTab(
  proxyPath: string,
  token: string | null,
): Promise<boolean> {
  const viewLinkPath = proxyPath.replace(/\/image$/, '/view-link');
  return openAdminSecureDocument(viewLinkPath, token, { proxyPath });
}
