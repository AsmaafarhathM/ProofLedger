import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CaseStatus } from '@prisma/client';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Case number is required (e.g., CASE-2026-001)' })
  caseNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Case title is required' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CaseStatus, {
    message: 'Status must be one of: DRAFT, ACTIVE, SUSPENDED, CLOSED, ARCHIVED',
  })
  status?: CaseStatus = CaseStatus.ACTIVE;
}
