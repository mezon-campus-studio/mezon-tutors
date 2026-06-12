import { Injectable, NotFoundException } from '@nestjs/common';
import {
  TUTOR_SETUP_CHECKLIST_ITEM_IDS,
  type TutorSetupChecklistDto,
  type UpdateTutorSetupChecklistDto,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TutorSetupChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  private isSetupMezonClanComplete(
    setupMezonClanComplete: boolean,
    hasMezonClan: boolean,
  ): boolean {
    return setupMezonClanComplete || hasMezonClan;
  }

  private buildDto(
    createMezonClanComplete: boolean,
    setupMezonClanComplete: boolean,
    channelAppsComplete: boolean,
    hasMezonClan: boolean,
  ): TutorSetupChecklistDto {
    const items = {
      createMezonClan: createMezonClanComplete,
      setupMezonClan: this.isSetupMezonClanComplete(setupMezonClanComplete, hasMezonClan),
      channelApps: channelAppsComplete,
    };

    const completedCount = TUTOR_SETUP_CHECKLIST_ITEM_IDS.filter(
      (itemId) => items[itemId],
    ).length;

    return {
      items,
      completedCount,
      totalCount: TUTOR_SETUP_CHECKLIST_ITEM_IDS.length,
      isAllComplete: completedCount === TUTOR_SETUP_CHECKLIST_ITEM_IDS.length,
    };
  }

  private async getTutorProfileByUserId(userId: string) {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        mezonClanId: true,
        setupChecklist: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Tutor profile not found');
    }

    return profile;
  }

  async getByUserId(userId: string): Promise<TutorSetupChecklistDto> {
    const profile = await this.getTutorProfileByUserId(userId);

    if (!profile.setupChecklist) {
      throw new NotFoundException('Tutor setup checklist not found');
    }

    const hasMezonClan = Boolean(profile.mezonClanId);

    return this.buildDto(
      profile.setupChecklist.createMezonClanComplete,
      profile.setupChecklist.setupMezonClanComplete,
      profile.setupChecklist.channelAppsComplete,
      hasMezonClan,
    );
  }

  async updateByUserId(
    userId: string,
    dto: UpdateTutorSetupChecklistDto,
  ): Promise<TutorSetupChecklistDto> {
    const profile = await this.getTutorProfileByUserId(userId);
    const hasMezonClan = Boolean(profile.mezonClanId);

    if (!profile.setupChecklist) {
      throw new NotFoundException('Tutor setup checklist not found');
    }

    const checklist = await this.prisma.tutorSetupChecklist.update({
      where: { tutorId: profile.id },
      data: {
        ...(dto.createMezonClanComplete !== undefined
          ? { createMezonClanComplete: dto.createMezonClanComplete }
          : {}),
        ...(dto.channelAppsComplete !== undefined
          ? { channelAppsComplete: dto.channelAppsComplete }
          : {}),
      },
    });

    return this.buildDto(
      checklist.createMezonClanComplete,
      checklist.setupMezonClanComplete,
      checklist.channelAppsComplete,
      hasMezonClan,
    );
  }

  async markSetupMezonClanComplete(tutorId: string): Promise<void> {
    await this.prisma.tutorSetupChecklist.updateMany({
      where: { tutorId },
      data: { setupMezonClanComplete: true },
    });
  }
}
