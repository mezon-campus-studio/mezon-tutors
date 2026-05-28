import { Body, Controller, Param, Put, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Controller('reviews')
@ApiTags('Reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(@Req() req: Request, @Body() dto: CreateReviewDto) {
    const user = req.user as AuthUserPayload;
    return this.reviewsService.createReview(user.sub, dto);
  }

  @Put(':reviewId')
  async updateReview(
    @Req() req: Request,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    const user = req.user as AuthUserPayload;
    return this.reviewsService.updateReview(reviewId, user.sub, dto);
  }
}
