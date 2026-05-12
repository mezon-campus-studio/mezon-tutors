import { IsString, IsUUID } from 'class-validator';

export class UpsertDmChannelDto {
  @IsUUID()
  senderId: string;

  @IsUUID()
  recipientId: string;

  @IsString()
  channelId: string;
}

export class GetDmChannelQueryDto {
  @IsUUID()
  senderId: string;

  @IsUUID()
  recipientId: string;
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
