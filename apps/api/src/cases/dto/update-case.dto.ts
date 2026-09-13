import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CaseStatus } from '@prisma/client';

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CaseStatus, {
    message: 'Status must be one of: DRAFT, ACTIVE, SUSPENDED, CLOSED, ARCHIVED',
  })
  status?: CaseStatus;
}
