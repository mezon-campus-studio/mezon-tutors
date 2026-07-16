import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type {
  CommunityCommentDto,
  CommunityEngagementDto,
  CommunityExerciseSubmissionDto,
  CommunityFeedResultDto,
  CommunityPostDetailDto,
  CommunityPostListItemDto,
  CommunitySearchResultDto,
  CommunityTagListItemDto,
  ToggleCommunityFollowResultDto,
  ToggleCommunityUpvoteResultDto,
} from '@mezon-tutors/shared';
import type { CommunityFeedSort } from '@mezon-tutors/shared';
import { CommunityPostType, Role } from '@mezon-tutors/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { CommunityService } from './community.service';
import {
  CommunityFeedQueryDto,
  CommunitySearchQueryDto,
  CreateCommunityCommentDto,
  CreateCommunityPostDto,
  CreateCommunityReportDto,
  CreateCommunitySubmissionDto,
  UpdateCommunityPostDto,
} from './dto/community.dto';

@Controller('community')
@ApiTags('Community')
export class PublicCommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List community feed' })
  listFeed(
    @Query() query: CommunityFeedQueryDto,
    @Req() req: Request,
  ): Promise<CommunityFeedResultDto> {
    const user = req.user as AuthUserPayload | undefined;
    return this.communityService.listFeed({
      sort: query.sort as CommunityFeedSort | undefined,
      type: query.type as CommunityPostType | undefined,
      tag: query.tag,
      authorId: query.authorId,
      following: query.following,
      cursor: query.cursor,
      limit: query.limit,
      userId: user?.sub,
    });
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Search community posts' })
  search(
    @Query() query: CommunitySearchQueryDto,
    @Req() req: Request,
  ): Promise<CommunitySearchResultDto> {
    const user = req.user as AuthUserPayload | undefined;
    return this.communityService.search({
      q: query.q,
      type: query.type as CommunityPostType | undefined,
      tag: query.tag,
      authorId: query.authorId,
      page: query.page,
      limit: query.limit,
      userId: user?.sub,
    });
  }

  @Get('tags')
  @ApiOperation({ summary: 'List community tags' })
  listTags(): Promise<CommunityTagListItemDto[]> {
    return this.communityService.listTags();
  }

  @Get('posts/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get community post by id' })
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<CommunityPostDetailDto> {
    const user = req.user as AuthUserPayload | undefined;
    return this.communityService.getById(id, user?.sub);
  }

  @Get('posts/:id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List comments on a community post' })
  listComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<CommunityCommentDto[]> {
    const user = req.user as AuthUserPayload | undefined;
    return this.communityService.listComments(id, user?.sub);
  }
}

@Controller('community')
@ApiTags('Community')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserCommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post('posts')
  @ApiOperation({ summary: 'Create and publish a community post' })
  create(
    @Req() req: Request,
    @Body() body: CreateCommunityPostDto,
  ): Promise<CommunityPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.create(user.sub, body);
  }

  @Get('posts/mine')
  @ApiOperation({ summary: 'List posts by current user' })
  listMine(@Req() req: Request): Promise<CommunityPostListItemDto[]> {
    const user = req.user as AuthUserPayload;
    return this.communityService.listMine(user.sub);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Update own community post' })
  update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCommunityPostDto,
  ): Promise<CommunityPostDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.update(user.sub, id, body);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Soft delete own community post' })
  async remove(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    const user = req.user as AuthUserPayload;
    await this.communityService.remove(user.sub, id);
    return { success: true };
  }

  @Get('posts/:id/engagement')
  @ApiOperation({ summary: 'Get engagement state for current user' })
  getEngagement(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommunityEngagementDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.getEngagement(user.sub, id);
  }

  @Post('posts/:id/upvote')
  @ApiOperation({ summary: 'Toggle upvote on a community post' })
  toggleUpvote(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ToggleCommunityUpvoteResultDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.togglePostUpvote(user.sub, id);
  }

  @Post('users/:id/follow')
  @ApiOperation({ summary: 'Toggle follow on a user' })
  toggleFollow(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ToggleCommunityFollowResultDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.toggleFollow(user.sub, id);
  }

  @Get('following/ids')
  @ApiOperation({ summary: 'Get IDs of users I follow' })
  getFollowingIds(@Req() req: Request): Promise<string[]> {
    const user = req.user as AuthUserPayload;
    return this.communityService.getFollowingUserIds(user.sub);
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Add a comment on a community post' })
  createComment(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateCommunityCommentDto,
  ): Promise<CommunityCommentDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.createComment(
      user.sub,
      id,
      body.content,
      body.parentId,
    );
  }

  @Delete('posts/:postId/comments/:commentId')
  @ApiOperation({ summary: 'Soft delete own comment' })
  async deleteComment(
    @Req() req: Request,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<{ success: true }> {
    const user = req.user as AuthUserPayload;
    await this.communityService.deleteComment(user.sub, postId, commentId);
    return { success: true };
  }

  @Post('posts/:postId/comments/:commentId/upvote')
  @ApiOperation({ summary: 'Toggle upvote on a comment' })
  toggleCommentUpvote(
    @Req() req: Request,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<ToggleCommunityUpvoteResultDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.toggleCommentUpvote(user.sub, postId, commentId);
  }

  @Post('posts/:id/submissions')
  @ApiOperation({ summary: 'Submit exercise answer' })
  submitExercise(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateCommunitySubmissionDto,
  ): Promise<CommunityExerciseSubmissionDto> {
    const user = req.user as AuthUserPayload;
    return this.communityService.submitExercise(user.sub, id, body.answer);
  }

  @Get('posts/:id/submissions/mine')
  @ApiOperation({ summary: 'List my exercise submissions' })
  listMySubmissions(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommunityExerciseSubmissionDto[]> {
    const user = req.user as AuthUserPayload;
    return this.communityService.listMySubmissions(user.sub, id);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Report a post or comment' })
  createReport(
    @Req() req: Request,
    @Body() body: CreateCommunityReportDto,
  ): Promise<{ success: true }> {
    const user = req.user as AuthUserPayload;
    return this.communityService.createReport(user.sub, body);
  }
}

@Controller('admin/community/reports')
@ApiTags('Admin - Community Reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CTV)
@ApiBearerAuth()
export class AdminCommunityReportController {
  constructor(private readonly communityService: CommunityService) {}

  @Get()
  @ApiOperation({ summary: 'List all community reports (admin)' })
  list(
    @Query('status') status?: string,
  ): Promise<Array<{
    id: string;
    reason: string;
    description: string | null;
    status: string;
    createdAt: string;
    reporter: { id: string; username: string; avatar: string };
    post: { id: string; content: string; publishedAt: string; author: { id: string; username: string; avatar: string } } | null;
  }>> {
    return this.communityService.listReports(status);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve report and hide the post' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    const user = req.user as AuthUserPayload;
    await this.communityService.approveReport(id, user.sub);
    return { success: true };
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss a report' })
  async dismiss(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    const user = req.user as AuthUserPayload;
    await this.communityService.dismissReport(id, user.sub);
    return { success: true };
  }
}
