import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CaseStatus } from '@prisma/client';

export class QueryCaseDto {
  @IsOptional()
  @IsEnum(CaseStatus, {
    message: 'Status filter must be one of: DRAFT, ACTIVE, SUSPENDED, CLOSED, ARCHIVED',
  })
  status?: CaseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
