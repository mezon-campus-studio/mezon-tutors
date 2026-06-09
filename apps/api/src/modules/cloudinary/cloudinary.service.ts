import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  buildGoogleDocsViewerUrl,
  extensionFromFileName,
  mimeTypeFromCloudinaryFormat,
  parsePrivateFileKey,
  resolveEffectiveFormat,
  resolvePrivateDownloadFileName,
  type SecurePrivateViewLink,
} from '@mezon-tutors/shared';
import { v2 as cloudinary } from 'cloudinary';
import { AppConfigService } from '../../shared/services/app-config.service';

type UploadOptions = {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  isPrivate?: boolean;
};

type ResolvedCloudinaryAsset = {
  publicId: string;
  format: string;
  resourceType: 'image' | 'raw';
};

@Injectable()
export class CloudinaryService {
  constructor(private readonly appConfig: AppConfigService) {
    const config = this.appConfig.cloudinaryConfig;
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  private ensureConfigured() {
    const c = this.appConfig.cloudinaryConfig;
    if (!c.cloudName?.trim() || !c.apiKey?.trim() || !c.apiSecret?.trim()) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the API environment.'
      );
    }
  }

  async uploadFile(buffer: Buffer, options?: UploadOptions) {
    this.ensureConfigured();
    if (!buffer?.length) {
      throw new BadRequestException('File buffer is empty');
    }

    return new Promise<{
      publicId: string;
      secureUrl: string;
      url: string;
      resourceType: string;
      bytes: number;
      format?: string;
      width?: number;
      height?: number;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder,
          public_id: options?.publicId,
          resource_type: options?.resourceType || 'auto',
          type: options?.isPrivate ? 'private' : 'upload',
        },
        (error, result) => {
          if (error) {
            reject(new InternalServerErrorException(error.message || 'Upload to Cloudinary failed'));
            return;
          }

          if (!result) {
            reject(new InternalServerErrorException('Cloudinary did not return upload result'));
            return;
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            url: result.url,
            resourceType: result.resource_type,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  async uploadPrivateFile(
    buffer: Buffer,
    options?: Omit<UploadOptions, 'isPrivate'>
  ): Promise<{ publicId: string; resourceType: string; format?: string }> {
    const result = await this.uploadFile(buffer, { ...options, isPrivate: true });
    return {
      publicId: result.publicId,
      resourceType: result.resourceType,
      format: result.format,
    };
  }

  async deleteFile(fileKeyOrPublicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
    this.ensureConfigured();
    if (!fileKeyOrPublicId?.trim()) {
      throw new BadRequestException('publicId is required');
    }

    const parsed = parsePrivateFileKey(fileKeyOrPublicId);
    const publicId = parsed?.publicId ?? fileKeyOrPublicId.trim();
    const effectiveResourceType = parsed?.resourceType ?? resourceType;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: effectiveResourceType === 'raw' ? 'raw' : 'image',
    });

    return {
      publicId,
      result: result.result,
    };
  }

  /**
   * Accepts either a Cloudinary public_id or a full secure_url stored in fileKey.
   * Legacy records store secure_url; newer records may store public_id directly.
   */
  resolveAssetReference(fileKey: string): ResolvedCloudinaryAsset {
    const trimmed = fileKey.trim();
    if (!trimmed) {
      throw new BadRequestException('fileKey is required');
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      const lastSegment = trimmed.split('/').pop() ?? trimmed;
      const dotIdx = lastSegment.lastIndexOf('.');
      if (dotIdx > 0) {
        return {
          publicId: trimmed.slice(0, trimmed.length - (lastSegment.length - dotIdx)),
          format: lastSegment.slice(dotIdx + 1),
          resourceType: 'image',
        };
      }
      return { publicId: trimmed, format: 'pdf', resourceType: 'raw' };
    }

    const url = new URL(trimmed);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const uploadIdx = pathParts.indexOf('upload');
    if (uploadIdx < 1) {
      throw new BadRequestException('Invalid Cloudinary URL');
    }

    const resourceType = pathParts[uploadIdx - 1];
    let segments = pathParts.slice(uploadIdx + 1);

    if (segments[0]?.match(/^v\d+$/)) {
      segments = segments.slice(1);
    }

    while (
      segments.length > 1 &&
      /^[a-z0-9_,.-]+$/i.test(segments[0]) &&
      (segments[0].includes('_') || segments[0].includes(','))
    ) {
      segments = segments.slice(1);
    }

    const filename = segments.pop() ?? '';
    const dotIdx = filename.lastIndexOf('.');
    const format = dotIdx >= 0 ? filename.slice(dotIdx + 1) : 'jpg';
    const publicId = [...segments, dotIdx >= 0 ? filename.slice(0, dotIdx) : filename].join('/');

    if (!publicId) {
      throw new BadRequestException('Could not extract public_id from Cloudinary URL');
    }

    return {
      publicId,
      format,
      resourceType: resourceType === 'raw' ? 'raw' : 'image',
    };
  }

  private async fetchFromUrl(
    url: string,
    notFoundLabel: string
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException(`Asset not found: ${notFoundLabel}`);
      }
      throw new InternalServerErrorException(
        `Failed to fetch asset from Cloudinary: ${response.status}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    };
  }

  private normalizeFormat(format: string): string {
    return format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase();
  }

  private async lookupPrivateResource(publicId: string): Promise<ResolvedCloudinaryAsset | null> {
    for (const resourceType of ['raw', 'image'] as const) {
      try {
        const info = await cloudinary.api.resource(publicId, {
          resource_type: resourceType,
          type: 'private',
        });
        if (info?.public_id) {
          return {
            publicId: info.public_id,
            format: this.normalizeFormat(info.format || 'bin'),
            resourceType,
          };
        }
      } catch {
        /* try next resource type */
      }
    }
    return null;
  }

  private buildFetchAttempts(fileKey: string): ResolvedCloudinaryAsset[] {
    const trimmed = fileKey.trim();
    const attempts: ResolvedCloudinaryAsset[] = [];
    const seen = new Set<string>();
    const push = (asset: ResolvedCloudinaryAsset) => {
      const key = `${asset.resourceType}:${asset.format}:${asset.publicId}`;
      if (seen.has(key)) return;
      seen.add(key);
      attempts.push(asset);
    };

    const encoded = parsePrivateFileKey(trimmed);
    if (encoded) {
      const encodedFormat = this.normalizeFormat(encoded.format);
      push({
        publicId: encoded.publicId,
        format: encodedFormat,
        resourceType: encoded.resourceType,
      });
      const inferred = encoded.originalFileName
        ? extensionFromFileName(encoded.originalFileName)
        : null;
      if (inferred && inferred !== encodedFormat) {
        push({
          publicId: encoded.publicId,
          format: inferred,
          resourceType: encoded.resourceType,
        });
      }
      return attempts;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      const fromUrl = this.resolveAssetReference(trimmed);
      push({
        publicId: fromUrl.publicId,
        format: this.normalizeFormat(fromUrl.format),
        resourceType: fromUrl.resourceType === 'raw' ? 'raw' : 'image',
      });
      return attempts;
    }

    const barePublicId = trimmed;
    for (const resourceType of ['raw', 'image'] as const) {
      for (const format of ['pdf', 'docx', 'doc', 'png', 'jpg']) {
        push({ publicId: barePublicId, resourceType, format });
      }
    }

    return attempts;
  }

  private async fetchResolvedPrivateAsset(
    resolved: ResolvedCloudinaryAsset,
    originalFileKey: string
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const format = this.normalizeFormat(resolved.format);
    const isLegacyPublicUrl = /^https?:\/\//i.test(originalFileKey.trim());

    if (isLegacyPublicUrl) {
      const fetched = await this.fetchFromUrl(originalFileKey.trim(), resolved.publicId);
      return {
        ...fetched,
        fileName: `document.${format}`,
        contentType: mimeTypeFromCloudinaryFormat(format) || fetched.contentType,
      };
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const privateUrl = cloudinary.utils.private_download_url(resolved.publicId, format, {
      resource_type: resolved.resourceType === 'raw' ? 'raw' : 'image',
      type: 'private',
      expires_at: expiresAt,
    });

    try {
      const fetched = await this.fetchFromUrl(privateUrl, resolved.publicId);
      return {
        ...fetched,
        fileName: `document.${format}`,
        contentType: mimeTypeFromCloudinaryFormat(format) || fetched.contentType,
      };
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    const legacyPublicUrl = cloudinary.url(resolved.publicId, {
      resource_type: resolved.resourceType,
      type: 'upload',
      secure: true,
      format,
    });

    const fetched = await this.fetchFromUrl(legacyPublicUrl, resolved.publicId);
    return {
      ...fetched,
      fileName: `document.${format}`,
      contentType: mimeTypeFromCloudinaryFormat(format) || fetched.contentType,
    };
  }

  private async buildResolvedFetchAttempts(fileKey: string): Promise<ResolvedCloudinaryAsset[]> {
    const trimmed = fileKey.trim();
    let attempts = this.buildFetchAttempts(trimmed);

    if (!parsePrivateFileKey(trimmed) && !/^https?:\/\//i.test(trimmed)) {
      const lookedUp = await this.lookupPrivateResource(trimmed);
      if (lookedUp) {
        attempts = [lookedUp, ...attempts];
      }
    }

    return attempts;
  }

  private async resolvePrivateAsset(fileKey: string): Promise<ResolvedCloudinaryAsset> {
    const trimmed = fileKey.trim();
    const attempts = await this.buildResolvedFetchAttempts(trimmed);

    for (const attempt of attempts) {
      try {
        await cloudinary.api.resource(attempt.publicId, {
          resource_type: attempt.resourceType,
          type: 'private',
        });
        return attempt;
      } catch {
        /* try next candidate */
      }
    }

    if (attempts[0]) {
      return attempts[0];
    }

    throw new NotFoundException(`Asset not found: ${trimmed}`);
  }

  /**
   * Issues a short-lived signed Cloudinary URL for admin viewing.
   * URL expires quickly and is only returned to authenticated admin APIs.
   */
  async createPrivateViewLink(
    fileKey: string,
    options?: { preferredFileName?: string; expiresInSeconds?: number }
  ): Promise<SecurePrivateViewLink> {
    this.ensureConfigured();
    if (!fileKey?.trim()) {
      throw new BadRequestException('fileKey is required');
    }

    const trimmed = fileKey.trim();
    const resolved = await this.resolvePrivateAsset(trimmed);
    const preliminaryFileName = resolvePrivateDownloadFileName(
      trimmed,
      resolved.format,
      options?.preferredFileName
    );
    const format = resolveEffectiveFormat(
      this.normalizeFormat(resolved.format),
      preliminaryFileName,
      trimmed
    );
    const expiresInSeconds = options?.expiresInSeconds ?? 300;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const openUrl = cloudinary.utils.private_download_url(resolved.publicId, format, {
      resource_type: resolved.resourceType === 'raw' ? 'raw' : 'image',
      type: 'private',
      expires_at: expiresAt,
    });

    const fileName = resolvePrivateDownloadFileName(
      trimmed,
      format,
      options?.preferredFileName
    );
    const contentType = mimeTypeFromCloudinaryFormat(format);
    const viewerUrl = ['doc', 'docx'].includes(format)
      ? buildGoogleDocsViewerUrl(openUrl)
      : null;

    return {
      openUrl,
      viewerUrl,
      fileName,
      format,
      contentType,
      expiresAt,
    };
  }

  /**
   * Fetches a Cloudinary private asset server-to-server.
   * Supports encoded file keys (raw::pdf::folder/id), legacy URLs, and bare public_ids.
   */
  async fetchPrivateAsset(
    fileKey: string,
    options?: { preferredFileName?: string }
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    this.ensureConfigured();
    if (!fileKey?.trim()) {
      throw new BadRequestException('fileKey is required');
    }

    const trimmed = fileKey.trim();
    const attempts = await this.buildResolvedFetchAttempts(trimmed);

    let lastError: NotFoundException | null = null;
    for (const attempt of attempts) {
      try {
        const fetched = await this.fetchResolvedPrivateAsset(attempt, trimmed);
        const preliminaryFileName = resolvePrivateDownloadFileName(
          trimmed,
          attempt.format,
          options?.preferredFileName
        );
        const effectiveFormat = resolveEffectiveFormat(
          attempt.format,
          preliminaryFileName,
          trimmed
        );
        const fileName = resolvePrivateDownloadFileName(
          trimmed,
          effectiveFormat,
          options?.preferredFileName
        );
        return {
          ...fetched,
          fileName,
          contentType:
            mimeTypeFromCloudinaryFormat(effectiveFormat) || fetched.contentType,
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new NotFoundException(`Asset not found: ${trimmed}`);
  }

  createUploadSignature(params: { folder?: string; publicId?: string; timestamp?: number }) {
    this.ensureConfigured();
    const timestamp = params.timestamp || Math.floor(Date.now() / 1000);
    const payload: Record<string, string | number> = {
      timestamp,
    };

    if (params.folder) payload.folder = params.folder;
    if (params.publicId) payload.public_id = params.publicId;

    const signature = cloudinary.utils.api_sign_request(
      payload,
      this.appConfig.cloudinaryConfig.apiSecret
    );

    return {
      cloudName: this.appConfig.cloudinaryConfig.cloudName,
      apiKey: this.appConfig.cloudinaryConfig.apiKey,
      timestamp,
      signature,
      folder: params.folder || null,
      publicId: params.publicId || null,
    };
  }
}
