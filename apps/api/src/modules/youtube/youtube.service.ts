import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from '../../shared/services/app-config.service';
import { AppSettingsService } from '../app-settings/app-settings.service';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_INIT_URL =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const YOUTUBE_PLAYLIST_ITEMS_URL =
  'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet';
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const MAX_INTRO_VIDEO_DURATION_SECONDS = 120;
const LANDSCAPE_TRANSFORM = 'c_fill,ar_16:9,w_1280,h_720,q_auto,f_mp4';

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

type YoutubeVideoResource = {
  id?: string;
};

type PublishIntroVideoOptions = {
  title: string;
  description?: string;
  maxDurationSeconds?: number;
};

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private cachedAccessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  isConfigured(): boolean {
    const { clientId, clientSecret, refreshToken } = this.appConfig.youtubeUploadConfig;
    return Boolean(clientId && clientSecret && refreshToken);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'YouTube upload is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN in the API environment.',
      );
    }
  }

  toLandscapeCloudinaryVideoUrl(sourceUrl: string): string {
    const trimmed = sourceUrl.trim();
    const uploadMarker = '/video/upload/';
    const markerIndex = trimmed.indexOf(uploadMarker);
    if (markerIndex < 0) {
      return trimmed;
    }

    const prefix = trimmed.slice(0, markerIndex + uploadMarker.length);
    const remainder = trimmed.slice(markerIndex + uploadMarker.length);

    if (remainder.startsWith(`${LANDSCAPE_TRANSFORM}/`)) {
      return trimmed;
    }

    return `${prefix}${LANDSCAPE_TRANSFORM}/${remainder}`;
  }

  private async getAccessToken(): Promise<string> {
    this.assertConfigured();

    if (this.cachedAccessToken && Date.now() < this.accessTokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return this.cachedAccessToken;
    }

    const { clientId, clientSecret, refreshToken } = this.appConfig.youtubeUploadConfig;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`YouTube token refresh failed: ${response.status} ${errorText}`);
      throw new InternalServerErrorException('Failed to authenticate with YouTube');
    }

    const data = (await response.json()) as GoogleTokenResponse;
    if (!data.access_token) {
      throw new InternalServerErrorException('YouTube token response missing access_token');
    }

    this.cachedAccessToken = data.access_token;
    this.accessTokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    return data.access_token;
  }

  private async resolvePlaylistId(): Promise<string | null> {
    const settings = await this.appSettingsService.getSettings();
    const playlistId = settings.youtubeSettings?.playlistId?.trim();
    return playlistId || null;
  }

  private async addVideoToPlaylist(
    accessToken: string,
    videoId: string,
    playlistId: string,
  ): Promise<void> {
    const response = await fetch(YOUTUBE_PLAYLIST_ITEMS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `YouTube playlist insert failed for ${videoId} → ${playlistId}: ${response.status} ${errorText}`,
      );
      throw new InternalServerErrorException(
        'Video uploaded to YouTube but could not be added to the configured playlist. Ensure YOUTUBE_REFRESH_TOKEN includes youtube.force-ssl scope.',
      );
    }
  }

  async uploadVideoFromBuffer(
    buffer: Buffer,
    mimeType: string,
    options: PublishIntroVideoOptions,
  ): Promise<{ videoId: string; videoUrl: string }> {
    if (!buffer?.length) {
      throw new BadRequestException('Video file is empty');
    }

    const accessToken = await this.getAccessToken();
    const { privacyStatus, categoryId } = this.appConfig.youtubeUploadConfig;
    const playlistId = await this.resolvePlaylistId();
    const contentType = mimeType?.trim() || 'video/mp4';
    const title = options.title.trim();
    const description = (options.description ?? '').trim();

    const initResponse = await fetch(YOUTUBE_UPLOAD_INIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(buffer.length),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          categoryId,
          tags: ['Mezonly', 'Tutor Introduction'],
        },
        status: {
          privacyStatus,
          embeddable: true,
          selfDeclaredMadeForKids: false,
        },
      }),
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      this.logger.error(`YouTube upload init failed: ${initResponse.status} ${errorText}`);
      throw new InternalServerErrorException('Failed to start YouTube upload');
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw new InternalServerErrorException('YouTube did not return an upload URL');
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
      },
      body: new Uint8Array(buffer),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      this.logger.error(`YouTube upload failed: ${uploadResponse.status} ${errorText}`);
      throw new InternalServerErrorException('Failed to upload video to YouTube');
    }

    const resource = (await uploadResponse.json()) as YoutubeVideoResource;
    const videoId = resource.id?.trim();
    if (!videoId) {
      throw new InternalServerErrorException('YouTube did not return a video ID');
    }

    if (playlistId) {
      await this.addVideoToPlaylist(accessToken, videoId, playlistId);
    }

    return {
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  async uploadVideoFromUrl(
    sourceUrl: string,
    options: PublishIntroVideoOptions & { durationSeconds?: number | null },
  ): Promise<{ videoId: string; videoUrl: string }> {
    const trimmedUrl = sourceUrl?.trim();
    if (!trimmedUrl) {
      throw new BadRequestException('cloudinaryUrl is required');
    }

    const maxDuration = options.maxDurationSeconds ?? MAX_INTRO_VIDEO_DURATION_SECONDS;
    if (
      typeof options.durationSeconds === 'number' &&
      options.durationSeconds > maxDuration
    ) {
      throw new BadRequestException(`Video must be ${maxDuration} seconds or shorter`);
    }

    const { forceLandscape } = this.appConfig.youtubeUploadConfig;
    const downloadUrl = forceLandscape
      ? this.toLandscapeCloudinaryVideoUrl(trimmedUrl)
      : trimmedUrl;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new BadRequestException('Could not download video from Cloudinary');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'video/mp4';
    return this.uploadVideoFromBuffer(buffer, contentType, options);
  }
}
