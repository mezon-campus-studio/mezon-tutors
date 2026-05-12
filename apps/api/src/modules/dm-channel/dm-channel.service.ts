import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetDmChannelQueryDto, MyDmChannelItemDto, UpsertDmChannelDto } from './dto/dm-channel.dto';

@Injectable()
export class DmChannelService {
  constructor(private readonly prisma: PrismaService) {}

  async createChannel(dto: UpsertDmChannelDto) {
    const [userAId, userBId] = [
      dto.senderId,
      dto.recipientId,
    ].sort();
  
    const existingChannel = await this.prisma.userDmChannel.findFirst({
      where: {
        OR: [
          {
            senderId: userAId,
            recipientId: userBId,
          },
          {
            senderId: userBId,
            recipientId: userAId,
          },
        ],
      },
    });
  
    if (existingChannel) {
      return existingChannel;
    }
  
    return this.prisma.userDmChannel.create({
      data: {
        senderId: userAId,
        recipientId: userBId,
        channelId: dto.channelId,
      },
    });
  }

  async getChannel(query: GetDmChannelQueryDto) {
    const [userAId, userBId] = [
      query.senderId,
      query.recipientId,
    ].sort();

    return this.prisma.userDmChannel.findUnique({
      where: {
        senderId_recipientId: {
          senderId: userAId,
          recipientId: userBId,
        },
      },
    });
  }

  async getMyChannels(userId: string): Promise<MyDmChannelItemDto[]> {
    const channels = await this.prisma.userDmChannel.findMany({
      where: {
        OR: [
          {
            senderId: userId,
          },
          {
            recipientId: userId,
          },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            mezonUserId: true,
            tutorProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        recipient: {
          select: {
            id: true,
            username: true,
            avatar: true,
            mezonUserId: true,
            tutorProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  
    return channels.map((channel) => {
      const peer =
        channel.senderId === userId
          ? channel.recipient
          : channel.sender;
  
      const peerName =
        peer.tutorProfile?.firstName != null ||
        peer.tutorProfile?.lastName != null
          ? `${peer.tutorProfile?.firstName ?? ''} ${peer.tutorProfile?.lastName ?? ''}`.trim()
          : peer.username;
  
      return {
        id: channel.id,
        channelId: channel.channelId,
        senderId: channel.senderId,
        recipientId: channel.recipientId,
        peerId: peer.id,
        peerName,
        peerAvatar: peer.avatar,
        peerMezonUserId: peer.mezonUserId,
        updatedAt: channel.updatedAt,
      };
    });
  }
}
