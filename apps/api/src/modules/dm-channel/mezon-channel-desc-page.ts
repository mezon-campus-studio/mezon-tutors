import { ChannelType, type ApiChannelDescription } from 'mezon-sdk';
import { MezonApi } from 'mezon-sdk/dist/cjs/api';
import {
  ChannelDescription,
  ListChannelDescsRequest,
} from 'mezon-sdk/dist/cjs/api/api';

export type MezonChannelDescPage = {
  channels: ApiChannelDescription[];
  nextCursor: string | null;
};

type ListMezonDirectMessagePageOptions = {
  api: MezonApi;
  basePath: string;
  accessToken: string;
  cursor: string;
  limit: number;
};

type MezonApiTransport = {
  rateLimitFetch: (url: string, options: RequestInit) => Promise<Response>;
};

function readVarint(bytes: Uint8Array, start: number): { value: number; next: number } {
  let value = 0;
  let shift = 0;
  let offset = start;

  while (offset < bytes.length && shift <= 28) {
    const byte = bytes[offset];
    value |= (byte & 0x7f) << shift;
    offset += 1;
    if ((byte & 0x80) === 0) {
      return { value: value >>> 0, next: offset };
    }
    shift += 7;
  }

  throw new Error('Invalid protobuf varint');
}

function skipField(bytes: Uint8Array, offset: number, wireType: number): number {
  if (wireType === 0) return readVarint(bytes, offset).next;
  if (wireType === 1) return offset + 8;
  if (wireType === 2) {
    const length = readVarint(bytes, offset);
    return length.next + length.value;
  }
  if (wireType === 5) return offset + 4;
  throw new Error(`Unsupported protobuf wire type ${wireType}`);
}

export function decodeMezonChannelDescPage(bytes: Uint8Array): MezonChannelDescPage {
  const channels: ApiChannelDescription[] = [];
  let nextCursor: string | null = null;
  let offset = 0;

  while (offset < bytes.length) {
    const tag = readVarint(bytes, offset);
    offset = tag.next;
    const fieldNumber = tag.value >>> 3;
    const wireType = tag.value & 7;

    if ((fieldNumber === 1 || fieldNumber === 2) && wireType === 2) {
      const length = readVarint(bytes, offset);
      const end = length.next + length.value;
      if (end > bytes.length) {
        throw new Error('Invalid protobuf field length');
      }
      const fieldBytes = bytes.subarray(length.next, end);
      if (fieldNumber === 1) {
        channels.push(
          ChannelDescription.decode(fieldBytes) as unknown as ApiChannelDescription
        );
      } else {
        const cursor = new TextDecoder().decode(fieldBytes).trim();
        nextCursor = cursor || null;
      }
      offset = end;
      continue;
    }

    offset = skipField(bytes, offset, wireType);
    if (offset > bytes.length) {
      throw new Error('Invalid protobuf field');
    }
  }

  return { channels, nextCursor };
}

export async function listMezonDirectMessagePage(
  options: ListMezonDirectMessagePageOptions
): Promise<MezonChannelDescPage> {
  const { api, basePath, accessToken, cursor, limit } = options;
  const body = ListChannelDescsRequest.encode(
    ListChannelDescsRequest.fromPartial({
      limit,
      state: 0,
      cursor,
      clan_id: '0',
      channel_type: ChannelType.CHANNEL_TYPE_DM,
      is_mobile: false,
    })
  ).finish();
  const response = await (api as unknown as MezonApiTransport).rateLimitFetch(
    `${basePath}/mezon.api.Mezon/ListChannelDescs?`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/proto',
        'Content-Type': 'application/proto',
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    }
  );

  if (response.status === 204) {
    return { channels: [], nextCursor: null };
  }

  return decodeMezonChannelDescPage(new Uint8Array(await response.arrayBuffer()));
}
