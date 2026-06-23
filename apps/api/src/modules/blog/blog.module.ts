import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  AdminBlogController,
  PublicBlogController,
  UserBlogController,
} from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicBlogController, UserBlogController, AdminBlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
