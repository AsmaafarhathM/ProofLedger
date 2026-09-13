import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CancelReviewDto } from './dto/cancel-review.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Peer Reviews')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('evidence/:evidenceId/reviews')
  @ApiOperation({ summary: 'Request a peer forensic review for an evidence item' })
  @ApiResponse({ status: 201, description: 'Review request created' })
  async createReview(
    @Param('evidenceId') evidenceId: string,
    @Request() req: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(evidenceId, req.user.id, dto);
  }

  @Get('evidence/:evidenceId/reviews')
  @ApiOperation({ summary: 'List reviews for an evidence item' })
  @ApiResponse({ status: 200, description: 'Reviews list' })
  async listEvidenceReviews(
    @Param('evidenceId') evidenceId: string,
    @Request() req: any,
    @Query() query: QueryReviewDto,
  ) {
    return this.reviewsService.listEvidenceReviews(evidenceId, req.user.id, query);
  }

  @Get(['evidence/:evidenceId/review-summary', 'evidence/:evidenceId/reviews/summary'])
  @ApiOperation({ summary: 'Get aggregated review summary statistics for an evidence item' })
  @ApiResponse({ status: 200, description: 'Review summary statistics' })
  async getReviewSummary(
    @Param('evidenceId') evidenceId: string,
    @Request() req: any,
  ) {
    return this.reviewsService.getReviewSummary(evidenceId, req.user.id);
  }

  @Get('reviews/:reviewId')
  @ApiOperation({ summary: 'Get details of a single review request' })
  @ApiResponse({ status: 200, description: 'Review record' })
  async getReview(@Param('reviewId') reviewId: string, @Request() req: any) {
    return this.reviewsService.getReview(reviewId, req.user.id);
  }

  @Post('reviews/:reviewId/start')
  @ApiOperation({ summary: 'Initiate a peer review audit (PENDING -> IN_REVIEW)' })
  @ApiResponse({ status: 200, description: 'Review started' })
  async startReview(@Param('reviewId') reviewId: string, @Request() req: any) {
    return this.reviewsService.startReview(reviewId, req.user.id);
  }

  @Post('reviews/:reviewId/decision')
  @ApiOperation({ summary: 'Submit approval or rejection decision on evidence' })
  @ApiResponse({ status: 200, description: 'Review decision recorded' })
  async submitDecision(
    @Param('reviewId') reviewId: string,
    @Request() req: any,
    @Body() dto: ReviewDecisionDto,
  ) {
    return this.reviewsService.submitDecision(reviewId, req.user.id, dto);
  }

  @Post('reviews/:reviewId/cancel')
  @ApiOperation({ summary: 'Cancel a review request' })
  @ApiResponse({ status: 200, description: 'Review cancelled' })
  async cancelReview(
    @Param('reviewId') reviewId: string,
    @Request() req: any,
    @Body() dto: CancelReviewDto,
  ) {
    return this.reviewsService.cancelReview(reviewId, req.user.id, dto);
  }
}
