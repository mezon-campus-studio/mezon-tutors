export const PRIVATE_FILE_KEY_SEP = '::';

/** Encodes resource type + format + public_id (+ optional original filename) for private downloads. */
export function buildPrivateFileKey(
  publicId: string,
  resourceType: string,
  format?: string | null,
  originalFileName?: string | null
): string {
  const rt: 'image' | 'raw' = resourceType === 'raw' ? 'raw' : 'image';
  const fmt = (format || 'bin').toLowerCase().replace(/^jpeg$/, 'jpg');
  const base = `${rt}${PRIVATE_FILE_KEY_SEP}${fmt}${PRIVATE_FILE_KEY_SEP}${publicId}`;
  if (originalFileName?.trim()) {
    return `${base}${PRIVATE_FILE_KEY_SEP}${encodeURIComponent(originalFileName.trim())}`;
  }
  return base;
}

export function parsePrivateFileKey(
  fileKey: string
): {
  publicId: string;
  resourceType: 'image' | 'raw';
  format: string;
  originalFileName?: string;
} | null {
  const trimmed = fileKey.trim();
  const parts = trimmed.split(PRIVATE_FILE_KEY_SEP);
  if (parts.length < 3 || (parts[0] !== 'raw' && parts[0] !== 'image')) {
    return null;
  }
  return {
    resourceType: parts[0] as 'image' | 'raw',
    format: parts[1],
    publicId: parts[2],
    originalFileName: parts[3] ? decodeURIComponent(parts[3]) : undefined,
  };
}

export function extensionFromCloudinaryFormat(format: string): string {
  const normalized = format.toLowerCase().replace(/^jpeg$/, 'jpg');
  return normalized === 'bin' ? '' : normalized;
}

const KNOWN_UPLOAD_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
]);

export function extensionFromFileName(fileName: string): string | null {
  const match = /\.([a-z0-9]{2,5})$/i.exec(fileName.trim());
  if (!match?.[1]) return null;
  const ext = match[1].toLowerCase().replace(/^jpeg$/, 'jpg');
  if (KNOWN_UPLOAD_EXTENSIONS.has(ext) || ext === 'jpg') return ext;
  return null;
}

/** Prefer Cloudinary format; fall back to the original upload filename extension. */
export function resolveEffectiveFormat(
  format: string,
  fileName?: string | null,
  fileKey?: string | null
): string {
  const normalized = (format || '').toLowerCase().replace(/^jpeg$/, 'jpg');
  if (normalized && normalized !== 'bin') {
    return normalized;
  }

  const parsed = fileKey?.trim() ? parsePrivateFileKey(fileKey.trim()) : null;
  const names = [parsed?.originalFileName, fileName].filter(Boolean) as string[];
  for (const name of names) {
    const ext = extensionFromFileName(name);
    if (ext) return ext;
  }

  return normalized || 'bin';
}

export function sanitizeDownloadFileName(fileName: string): string {
  const trimmed = fileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
  return trimmed || 'document';
}

/** Ensures the download/view name includes the correct extension. */
export function ensureFileExtension(fileName: string, format: string): string {
  const safeName = sanitizeDownloadFileName(fileName);
  if (/\.[a-z0-9]{2,5}$/i.test(safeName)) {
    return safeName;
  }
  const ext = extensionFromCloudinaryFormat(format);
  return ext ? `${safeName}.${ext}` : safeName;
}

export function resolvePrivateDownloadFileName(
  fileKey: string,
  format: string,
  preferredFileName?: string | null
): string {
  const parsed = parsePrivateFileKey(fileKey);
  const candidate =
    parsed?.originalFileName?.trim() ||
    preferredFileName?.trim() ||
    'document';
  return ensureFileExtension(candidate, format);
}

/** Human-readable file name + format label for admin lists (parsed from encoded fileKey). */
export function derivePrivateFileDisplayMeta(
  fileKey: string | null | undefined,
  preferredFileName?: string | null
): { fileName: string | null; fileFormat: string | null } {
  if (!fileKey?.trim()) {
    return { fileName: null, fileFormat: null };
  }

  const trimmedKey = fileKey.trim();
  const parsed = parsePrivateFileKey(trimmedKey);
  if (parsed) {
    const fileName = resolvePrivateDownloadFileName(
      trimmedKey,
      parsed.format,
      preferredFileName
    );
    const effectiveFormat = resolveEffectiveFormat(parsed.format, fileName, trimmedKey);
    return {
      fileName,
      fileFormat: effectiveFormat === 'bin' ? null : effectiveFormat.toUpperCase(),
    };
  }

  const fromPreferred = preferredFileName?.trim();
  if (fromPreferred) {
    const effectiveFormat = resolveEffectiveFormat('bin', fromPreferred, trimmedKey);
    return {
      fileName: fromPreferred,
      fileFormat: effectiveFormat === 'bin' ? null : effectiveFormat.toUpperCase(),
    };
  }

  return { fileName: null, fileFormat: null };
}

export function isInlineViewableFormat(format: string): boolean {
  const normalized = format.toLowerCase().replace(/^jpeg$/, 'jpg');
  return ['pdf', 'jpg', 'png'].includes(normalized);
}

export function isDialogPreviewableFormat(format: string): boolean {
  const normalized = format.toLowerCase().replace(/^jpeg$/, 'jpg');
  // Legacy .doc cannot be rendered client-side; use Open to download instead.
  return ['pdf', 'docx', 'jpg', 'png'].includes(normalized);
}

export function buildContentDispositionHeader(
  fileName: string,
  disposition: 'inline' | 'attachment' = 'inline'
): string {
  const safe = sanitizeDownloadFileName(fileName);
  const asciiFallback = safe.replace(/[^\x20-\x7E]/g, '_') || 'document';
  const encoded = encodeURIComponent(safe);
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export function parseContentDispositionFilename(
  header: string | null | undefined
): string | null {
  if (!header) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const quotedMatch = /filename="([^"]+)"/i.exec(header);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = /filename=([^;]+)/i.exec(header);
  if (plainMatch?.[1]) return plainMatch[1].trim();
  return null;
}

export function isInlineViewableContentType(contentType: string): boolean {
  const type = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return type === 'application/pdf' || type.startsWith('image/');
}

/** Short-lived signed Cloudinary URL issued only to authenticated admins. */
export type SecurePrivateViewLink = {
  openUrl: string;
  viewerUrl: string | null;
  fileName: string;
  format: string;
  contentType: string;
  expiresAt: number;
};

export function buildGoogleDocsViewerUrl(fileUrl: string): string {
  return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}

export function resolveSecureDocumentOpenUrl(link: SecurePrivateViewLink): string {
  const format = resolveEffectiveFormat(link.format ?? '', link.fileName).toLowerCase();
  if (['doc', 'docx'].includes(format) && link.viewerUrl) {
    return link.viewerUrl;
  }
  if (!link.openUrl) {
    throw new Error('Secure document view link is missing openUrl');
  }
  return link.openUrl;
}

/** Unwraps `{ data, error }` API envelope when using raw fetch. */
export function unwrapSecurePrivateViewLink(payload: unknown): SecurePrivateViewLink | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const inner =
    record.data && typeof record.data === 'object' && 'openUrl' in (record.data as object)
      ? record.data
      : payload;
  if (!inner || typeof inner !== 'object') return null;
  const link = inner as Partial<SecurePrivateViewLink>;
  if (typeof link.openUrl !== 'string' || !link.openUrl.trim()) return null;
  return {
    openUrl: link.openUrl,
    viewerUrl: typeof link.viewerUrl === 'string' ? link.viewerUrl : null,
    fileName: typeof link.fileName === 'string' ? link.fileName : 'document',
    format: typeof link.format === 'string' ? link.format : '',
    contentType: typeof link.contentType === 'string' ? link.contentType : 'application/octet-stream',
    expiresAt: typeof link.expiresAt === 'number' ? link.expiresAt : 0,
  };
}

export function inferCloudinaryUploadResourceType(
  mimeType: string,
  fileName: string
): 'image' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf', 'doc', 'docx'].includes(ext)) return 'raw';
  if (mimeType === 'application/pdf') return 'raw';
  if (
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'raw';
  }
  return 'image';
}

export function mimeTypeFromCloudinaryFormat(format: string): string {
  switch (format.toLowerCase()) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

export const PROFESSIONAL_DOCUMENT_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
] as const;

export const ACCEPT_PROFESSIONAL_DOCUMENT_TYPES =
  '.pdf,.jpg,.jpeg,.png,.doc,.docx';

export const ACCEPT_CV_TYPES = ACCEPT_PROFESSIONAL_DOCUMENT_TYPES;
