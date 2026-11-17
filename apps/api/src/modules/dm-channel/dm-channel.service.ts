import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@mezon-tutors/db';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetDmChannelQueryDto,
  MyDmChannelItemDto,
  ResolveDmChannelDto,
  UpsertDmChannelDto,
} from './dto/dm-channel.dto';
import { MezonChannelVerificationService } from './mezon-channel-verification.service';

@Injectable()
export class DmChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mezonChannelVerification: MezonChannelVerificationService
  ) {}

  async createChannel(authenticatedUserId: string, dto: UpsertDmChannelDto) {
    const { authenticatedUser, recipient } = await this.getParticipants(
      authenticatedUserId,
      dto.recipientId
    );
    const [userAId, userBId] = [authenticatedUserId, dto.recipientId].sort();

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

    await this.mezonChannelVerification.assertDirectMessageParticipants(
      dto.mezonAccessToken,
      dto.mezonApiUrl,
      dto.channelId,
      [authenticatedUser.mezonUserId, recipient.mezonUserId]
    );

    return this.persistMapping(userAId, userBId, dto.channelId);
  }

  async resolveExistingChannel(authenticatedUserId: string, dto: ResolveDmChannelDto) {
    const { authenticatedUser, recipient } = await this.getParticipants(
      authenticatedUserId,
      dto.recipientId
    );
    const [userAId, userBId] = [authenticatedUserId, dto.recipientId].sort();
    const existing = await this.prisma.userDmChannel.findUnique({
      where: { senderId_recipientId: { senderId: userAId, recipientId: userBId } },
    });
    if (existing) {
      return existing;
    }

    const channel = await this.mezonChannelVerification.findDirectMessage(
      dto.mezonAccessToken,
      dto.mezonApiUrl,
      [authenticatedUser.mezonUserId, recipient.mezonUserId]
    );
    if (!channel?.channel_id) {
      return null;
    }
    return this.persistMapping(userAId, userBId, channel.channel_id);
  }

  private async getParticipants(authenticatedUserId: string, recipientId: string) {
    if (authenticatedUserId === recipientId) {
      throw new BadRequestException('Cannot create a direct-message mapping with yourself');
    }
    const participants = await this.prisma.user.findMany({
      where: { id: { in: [authenticatedUserId, recipientId] } },
      select: { id: true, mezonUserId: true },
    });
    const authenticatedUser = participants.find((user) => user.id === authenticatedUserId);
    const recipient = participants.find((user) => user.id === recipientId);
    if (!authenticatedUser) {
      throw new NotFoundException('Authenticated user not found');
    }
    if (!recipient) {
      throw new NotFoundException('DM recipient not found');
    }
    if (!authenticatedUser.mezonUserId || !recipient.mezonUserId) {
      throw new BadRequestException('Both users must have linked Mezon accounts');
    }
    return {
      authenticatedUser: { ...authenticatedUser, mezonUserId: authenticatedUser.mezonUserId },
      recipient: { ...recipient, mezonUserId: recipient.mezonUserId },
    };
  }

  private async persistMapping(senderId: string, recipientId: string, channelId: string) {
    try {
      return await this.prisma.userDmChannel.create({
        data: { senderId, recipientId, channelId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const racedMapping = await this.prisma.userDmChannel.findFirst({
          where: {
            OR: [
              { senderId, recipientId },
              { senderId: recipientId, recipientId: senderId },
            ],
          },
        });
        if (racedMapping) {
          return racedMapping;
        }
        throw new BadRequestException('Mezon channel is already linked to another conversation');
      }
      throw error;
    }
  }

  async getChannel(authenticatedUserId: string, query: GetDmChannelQueryDto) {
    const [userAId, userBId] = [authenticatedUserId, query.peerUserId].sort();

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
      const peer = channel.senderId === userId ? channel.recipient : channel.sender;

      const peerName =
        peer.tutorProfile?.firstName != null || peer.tutorProfile?.lastName != null
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
