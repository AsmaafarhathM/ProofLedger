import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReviewDto {
  @IsUUID('4', { message: 'reviewerId must be a valid UUID' })
  @IsNotEmpty({ message: 'reviewerId is required' })
  reviewerId: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
