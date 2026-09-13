import { IsOptional, IsString } from 'class-validator';

export class CancelReviewDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
