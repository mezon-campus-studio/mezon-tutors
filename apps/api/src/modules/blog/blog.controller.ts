import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type {
  BlogCommentDto,
  BlogEngagementDto,
  BlogMetricsDto,
  BlogPostDetailDto,
  BlogPostListItemDto,
  BlogPublishStatusFilter,
  BlogTagListItemDto,
  ToggleBlogUpvoteResultDto,
  ToggleCommentUpvoteResultDto,
} from '@mezon-tutors/shared';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { BlogService } from './blog.service';
import { CreateBlogDto, CreateBlogCommentDto, RejectBlogDto } from './dto/blog.dto';

@Controller('blog')
@ApiTags('Blog')
export class PublicBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List published blog posts' })
  listPublished(): Promise<BlogPostListItemDto[]> {
    return this.blogService.listPublished();
  }

  @Get('tags')
  @ApiOperation({ summary: 'List blog tags' })
  listTags(): Promise<BlogTagListItemDto[]> {
    return this.blogService.listTags();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published blog post by slug' })
  getBySlug(@Param('slug') slug: string): Promise<BlogPostDetailDto> {
    return this.blogService.getPublishedBySlug(slug);
  }

  @Get(':slug/comments')
  @ApiOperation({ summary: 'List comments on a published blog post' })
  listComments(
    @Param('slug') slug: string,
    @Req() req: Request,
  ): Promise<BlogCommentDto[]> {
    const user = req.user as AuthUserPayload | undefined;
    return this.blogService.listComments(slug, user?.sub);
  }
}

@Controller('blog')
@ApiTags('Blog')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new blog post for admin review' })
  create(
    @Req() req: Request,
    @Body() body: CreateBlogDto,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.createPending(user.sub, body);
  }

  @Get('submissions/mine')
  @ApiOperation({ summary: 'List blog posts submitted by current user' })
  listMine(@Req() req: Request): Promise<BlogPostListItemDto[]> {
    const user = req.user as AuthUserPayload;
    return this.blogService.listMySubmissions(user.sub);
  }

  @Get('submissions/mine/:id')
  @ApiOperation({ summary: 'Get one blog submission owned by current user' })
  getMineById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.getMySubmissionById(user.sub, id);
  }

  @Patch('submissions/mine/:id')
  @ApiOperation({ summary: 'Update an owned blog submission' })
  updateMine(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: CreateBlogDto,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.updateMySubmission(user.sub, id, body);
  }

  @Get(':slug/engagement')
  @ApiOperation({ summary: 'Get upvote status for current user on a blog post' })
  getEngagement(
    @Req() req: Request,
    @Param('slug') slug: string,
  ): Promise<BlogEngagementDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.getEngagement(user.sub, slug);
  }

  @Post(':slug/upvote')
  @ApiOperation({ summary: 'Toggle upvote on a published blog post' })
  toggleUpvote(
    @Req() req: Request,
    @Param('slug') slug: string,
  ): Promise<ToggleBlogUpvoteResultDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.toggleUpvote(user.sub, slug);
  }

  @Post(':slug/comments')
  @ApiOperation({ summary: 'Add a comment on a published blog post' })
  createComment(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body() body: CreateBlogCommentDto,
  ): Promise<BlogCommentDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.createComment(user.sub, slug, body.content, body.parentId);
  }

  @Post(':slug/comments/:commentId/upvote')
  @ApiOperation({ summary: 'Toggle upvote on a comment' })
  toggleCommentUpvote(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
  ): Promise<ToggleCommentUpvoteResultDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.toggleCommentUpvote(user.sub, slug, commentId);
  }

  @Delete(':slug/comments/:commentId')
  @ApiOperation({ summary: 'Delete own comment on a published blog post' })
  async deleteComment(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
  ): Promise<{ success: true }> {
    const user = req.user as AuthUserPayload;
    await this.blogService.deleteComment(user.sub, slug, commentId);
    return { success: true };
  }
}

@Controller('admin')
@ApiTags('Admin - Blog')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('blogs')
  @ApiOperation({ summary: 'List all blog posts for admin review' })
  list(
    @Query('status') status?: BlogPublishStatusFilter,
  ): Promise<BlogPostListItemDto[]> {
    return this.blogService.listAdmin(status);
  }

  @Get('blogs/metrics')
  @ApiOperation({ summary: 'Blog submission metrics' })
  metrics(): Promise<BlogMetricsDto> {
    return this.blogService.getMetrics();
  }

  @Get('blogs/:id')
  @ApiOperation({ summary: 'Get blog post detail for admin review' })
  getById(@Param('id') id: string): Promise<BlogPostDetailDto> {
    return this.blogService.getAdminById(id);
  }

  @Post('blogs/:id/publish')
  @ApiOperation({ summary: 'Publish blog post to end users' })
  publish(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.publish(id, user.sub);
  }

  @Post('blogs/:id/reject')
  @ApiOperation({ summary: 'Reject blog post submission' })
  reject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RejectBlogDto,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.reject(id, user.sub, body.reason);
  }

  @Post('blogs/:id/close')
  @ApiOperation({ summary: 'Close a published blog post' })
  close(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.close(id, user.sub);
  }

  @Post('blogs/:id/approve-update')
  @ApiOperation({ summary: 'Approve a pending update on a published blog post' })
  approveUpdate(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.approveUpdate(id, user.sub);
  }

  @Post('blogs/:id/reject-update')
  @ApiOperation({ summary: 'Reject a pending update on a published blog post' })
  rejectUpdate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RejectBlogDto,
  ): Promise<BlogPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.blogService.rejectUpdate(id, user.sub, body.reason);
  }
}
