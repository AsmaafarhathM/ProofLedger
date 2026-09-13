import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum ReviewDecisionType {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewDecisionDto {
  @IsEnum(ReviewDecisionType, { message: 'Decision must be APPROVED or REJECTED' })
  @IsNotEmpty({ message: 'Decision is required' })
  decision: ReviewDecisionType;

  @ValidateIf((o) => o.decision === ReviewDecisionType.REJECTED)
  @IsString({ message: 'Comments are required when rejecting evidence' })
  @IsNotEmpty({ message: 'Comments cannot be blank when rejecting evidence' })
  @IsOptional()
  comments?: string;
}
