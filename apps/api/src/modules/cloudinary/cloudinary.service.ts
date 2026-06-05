import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
  resourceType: 'image' | 'video' | 'raw';
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

  async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
    this.ensureConfigured();
    if (!publicId?.trim()) {
      throw new BadRequestException('publicId is required');
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
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
      return { publicId: trimmed, format: 'jpg', resourceType: 'image' };
    }

    const url = new URL(trimmed);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const uploadIdx = pathParts.indexOf('upload');
    if (uploadIdx < 1) {
      throw new BadRequestException('Invalid Cloudinary URL');
    }

    const resourceType = pathParts[uploadIdx - 1] as ResolvedCloudinaryAsset['resourceType'];
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
      resourceType: resourceType === 'video' || resourceType === 'raw' ? resourceType : 'image',
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

  /**
   * Fetches a Cloudinary asset server-to-server and returns it as a Buffer.
   * fileKey may be a public_id or a legacy secure_url (public upload).
   */
  async fetchPrivateAsset(
    fileKey: string,
    resourceType?: 'image' | 'raw'
  ): Promise<{ buffer: Buffer; contentType: string }> {
    this.ensureConfigured();
    if (!fileKey?.trim()) {
      throw new BadRequestException('fileKey is required');
    }

    const trimmed = fileKey.trim();
    const resolved = this.resolveAssetReference(trimmed);
    const effectiveResourceType = resourceType ?? resolved.resourceType;
    const format = resolved.format.toLowerCase() === 'jpeg' ? 'jpg' : resolved.format;
    const isLegacyPublicUrl = /^https?:\/\//i.test(trimmed);

    // Legacy uploads are public (type: upload) — private_download_url only works for private/authenticated assets.
    if (isLegacyPublicUrl) {
      return this.fetchFromUrl(trimmed, resolved.publicId);
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const privateUrl = cloudinary.utils.private_download_url(resolved.publicId, format, {
      resource_type: effectiveResourceType === 'raw' ? 'raw' : 'image',
      type: 'private',
      expires_at: expiresAt,
    });

    try {
      return await this.fetchFromUrl(privateUrl, resolved.publicId);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    const legacyPublicUrl = cloudinary.url(resolved.publicId, {
      resource_type: effectiveResourceType,
      type: 'upload',
      secure: true,
      format,
    });

    return this.fetchFromUrl(legacyPublicUrl, resolved.publicId);
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
