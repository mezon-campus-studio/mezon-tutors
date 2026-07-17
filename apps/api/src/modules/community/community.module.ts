import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  AdminCommunityReportController,
  PublicCommunityController,
  UserCommunityController,
} from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PublicCommunityController,
    UserCommunityController,
    AdminCommunityReportController,
  ],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
