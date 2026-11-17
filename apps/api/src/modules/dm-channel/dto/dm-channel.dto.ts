import { IsNotEmpty, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class UpsertDmChannelDto {
  @IsUUID()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  channelId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  mezonAccessToken: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(256)
  mezonApiUrl: string;
}

export class ResolveDmChannelDto {
  @IsUUID()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  mezonAccessToken: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(256)
  mezonApiUrl: string;
}

export class GetDmChannelQueryDto {
  @IsUUID()
  peerUserId: string;
}

export class MyDmChannelItemDto {
  id: string;
  channelId: string;
  senderId: string;
  recipientId: string;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  peerMezonUserId: string;
  updatedAt: Date;
}
