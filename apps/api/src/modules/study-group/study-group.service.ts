import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudyGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(userId: string, name: string) {
    // Generate a unique invite ID
    const inviteId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    
    return this.prisma.group.create({
      data: {
        name: name || 'Tên nhóm',
        leaderId: userId,
        inviteId,
        members: {
          create: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async updateName(userId: string, groupId: string, name: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) throw new NotFoundException('Group not found');
    if (group.leaderId !== userId) throw new ForbiddenException('Only leader can rename group');

    return this.prisma.group.update({
      where: { id: groupId },
      data: { name },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findOne(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async findByInvite(inviteId: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteId },
      include: {
        members: {
          take: 5,
          include: {
            user: true,
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async join(userId: string, inviteId: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteId },
    });

    if (!group) throw new NotFoundException('Group not found');

    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId,
        },
      },
    });

    if (existingMember) return group;

    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
      },
    });

    return group;
  }
}
