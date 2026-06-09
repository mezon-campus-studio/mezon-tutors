import {
  isDialogPreviewableFormat,
  resolveEffectiveFormat,
  type SecurePrivateViewLink,
} from '@mezon-tutors/shared';
import { apiClient, BASE_URL } from '@/services/api-client';

export type AdminDocumentPreview = {
  fileName: string;
  format: string;
  previewKind: 'iframe' | 'image' | 'docx';
  previewUrl?: string;
  docxBuffer?: ArrayBuffer;
  revoke?: () => void;
};

async function fetchAdminDocumentBlob(
  proxyPath: string,
  token: string,
): Promise<Blob | null> {
  const res = await fetch(`${BASE_URL}${proxyPath}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.blob();
}

/** Loads an authenticated admin document preview for in-app dialog viewing. */
export async function loadAdminSecureDocumentPreview(
  viewLinkPath: string,
  proxyPath: string,
  token: string | null,
): Promise<AdminDocumentPreview | null> {
  if (!token?.trim()) return null;

  try {
    const link = await apiClient.get<SecurePrivateViewLink>(viewLinkPath);
    if (!link?.openUrl) return null;

    const fileName = link.fileName || 'document';
    const effectiveFormat = resolveEffectiveFormat(link.format ?? '', fileName);
    if (!isDialogPreviewableFormat(effectiveFormat)) {
      return null;
    }

    if (effectiveFormat === 'docx') {
      const blob = await fetchAdminDocumentBlob(proxyPath, token);
      if (!blob) return null;
      return {
        fileName,
        format: effectiveFormat,
        previewKind: 'docx',
        docxBuffer: await blob.arrayBuffer(),
      };
    }

    if (effectiveFormat === 'doc') {
      return null;
    }

    const blob = await fetchAdminDocumentBlob(proxyPath, token);
    if (!blob) return null;

    const previewUrl = URL.createObjectURL(blob);
    const isImage = ['jpg', 'jpeg', 'png'].includes(effectiveFormat);

    return {
      fileName,
      format: effectiveFormat,
      previewUrl,
      previewKind: isImage ? 'image' : 'iframe',
      revoke: () => URL.revokeObjectURL(previewUrl),
    };
  } catch {
    return null;
  }
}
