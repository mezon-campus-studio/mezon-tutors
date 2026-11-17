import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ChannelType, type ApiChannelDescription } from 'mezon-sdk';
import { MezonApi } from 'mezon-sdk/dist/cjs/api';

const MEZON_REQUEST_TIMEOUT_MS = 7_000;
const MEZON_DM_PAGE_SIZE = 100;
const MEZON_DM_MAX_PAGES = 5;

class MezonProviderHttpError extends Error {
  constructor(readonly status: number) {
    super(`Mezon provider returned HTTP ${status}`);
  }
}

@Injectable()
export class MezonChannelVerificationService {
  async assertDirectMessageParticipants(
    accessToken: string,
    apiUrl: string,
    channelId: string,
    expectedMezonUserIds: [string, string]
  ): Promise<void> {
    try {
      const [authenticatedMezonUserId, recipientMezonUserId] = expectedMezonUserIds;
      if (
        !authenticatedMezonUserId ||
        !recipientMezonUserId ||
        authenticatedMezonUserId === recipientMezonUserId ||
        this.accessTokenUserId(accessToken) !== authenticatedMezonUserId
      ) {
        throw new BadRequestException('Mezon access token does not match the authenticated user');
      }

      const channel = await this.findDirectMessage(
        accessToken,
        apiUrl,
        expectedMezonUserIds,
        channelId
      );
      if (!channel) {
        throw new BadRequestException('Mezon channel does not match the requested participants');
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof MezonProviderHttpError) {
        if (error.status === 401 || error.status === 403) {
          throw new UnauthorizedException('Mezon session is invalid or expired');
        }
        throw new BadGatewayException('Mezon is temporarily unavailable');
      }
      throw new BadGatewayException('Unable to verify the Mezon direct-message channel');
    }
  }

  async findDirectMessage(
    accessToken: string,
    apiUrl: string,
    expectedMezonUserIds: [string, string],
    channelId?: string
  ): Promise<ApiChannelDescription | null> {
    const [authenticatedMezonUserId, recipientMezonUserId] = expectedMezonUserIds;
    if (
      !authenticatedMezonUserId ||
      !recipientMezonUserId ||
      authenticatedMezonUserId === recipientMezonUserId ||
      this.accessTokenUserId(accessToken) !== authenticatedMezonUserId
    ) {
      throw new BadRequestException('Mezon access token does not match the authenticated user');
    }

    const api = this.createApi(this.trustedMezonBasePath(apiUrl));

    if (channelId) {
      try {
        const channel = await api.listChannelDetail(accessToken, channelId);
        return this.hasExpectedParticipants(
          channel,
          authenticatedMezonUserId,
          recipientMezonUserId
        )
          ? channel
          : null;
      } catch (error) {
        if (error instanceof MezonProviderHttpError) {
          if (error.status === 401 || error.status === 403) {
            throw new UnauthorizedException('Mezon session is invalid or expired');
          }
          throw new BadGatewayException('Mezon is temporarily unavailable');
        }
        if (error instanceof HttpException) throw error;
        throw new BadGatewayException('Unable to query the Mezon direct-message channel');
      }
    }

    let cursor = '';
    const visitedCursors = new Set<string>();

    try {
      for (let page = 0; page < MEZON_DM_MAX_PAGES; page += 1) {
        const response = await api.listChannelDescs(
          accessToken,
          ChannelType.CHANNEL_TYPE_DM,
          '0',
          MEZON_DM_PAGE_SIZE,
          0,
          cursor,
          false
        );
        const match = response.channeldesc?.find(
          (channel) =>
            this.hasExpectedParticipants(channel, authenticatedMezonUserId, recipientMezonUserId)
        );
        if (match) {
          return match;
        }

        const nextCursor = response.next_cursor?.trim();
        if (!nextCursor || nextCursor === cursor || visitedCursors.has(nextCursor)) {
          return null;
        }
        visitedCursors.add(cursor);
        cursor = nextCursor;
      }
    } catch (error) {
      if (error instanceof MezonProviderHttpError) {
        if (error.status === 401 || error.status === 403) {
          throw new UnauthorizedException('Mezon session is invalid or expired');
        }
        throw new BadGatewayException('Mezon is temporarily unavailable');
      }
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('Unable to query Mezon direct-message channels');
    }

    throw new BadGatewayException('Mezon channel lookup exceeded the safe pagination limit');
  }

  private hasExpectedParticipants(
    channel: ApiChannelDescription,
    authenticatedMezonUserId: string,
    recipientMezonUserId: string
  ) {
    if (!channel.channel_id || channel.type !== ChannelType.CHANNEL_TYPE_DM) {
      return false;
    }
    const actualParticipants = new Set((channel.user_ids ?? []).filter(Boolean));
    const expectedParticipants = new Set([authenticatedMezonUserId, recipientMezonUserId]);
    const hasExactPair =
      actualParticipants.size === 2 &&
      [...actualParticipants].every((id) => expectedParticipants.has(id));
    const hasRecipientOnly =
      actualParticipants.size === 1 && actualParticipants.has(recipientMezonUserId);
    return hasExactPair || hasRecipientOnly;
  }

  private accessTokenUserId(accessToken: string): string | null {
    try {
      const payloadPart = accessToken.split('.')[1];
      if (!payloadPart) {
        return null;
      }
      const payloadJson = Buffer.from(payloadPart, 'base64url').toString('utf8');
      const uidMatch = payloadJson.match(/"uid"\s*:\s*(?:"([A-Za-z0-9_-]+)"|([0-9]+))/);
      return uidMatch?.[1] ?? uidMatch?.[2] ?? null;
    } catch {
      return null;
    }
  }

  private trustedMezonBasePath(apiUrl: string): string {
    let url: URL;
    try {
      url = new URL(apiUrl);
    } catch {
      throw new BadRequestException('Invalid Mezon API URL');
    }
    const isTrustedHost =
      url.hostname === 'mezon.ai' ||
      url.hostname.endsWith('.mezon.ai') ||
      url.hostname === 'mezonly.com' ||
      url.hostname.endsWith('.mezonly.com');
    if (
      url.protocol !== 'https:' ||
      !isTrustedHost ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    ) {
      throw new BadRequestException('Untrusted Mezon API URL');
    }
    return url.origin;
  }

  private createApi(basePath: string): MezonApi {
    const api = new MezonApi('DefaultServerKey', basePath, MEZON_REQUEST_TIMEOUT_MS);
    const transport = api as unknown as {
      rateLimitFetch: (url: string, options: RequestInit) => Promise<Response>;
    };
    const sdkFetch = transport.rateLimitFetch.bind(api);
    transport.rateLimitFetch = async (url, options) => {
      const response = await sdkFetch(url, options);
      if (!response.ok) {
        throw new MezonProviderHttpError(response.status);
      }
      return response;
    };
    return api;
  }
}
