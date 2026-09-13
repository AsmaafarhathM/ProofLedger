import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EvidenceStatus } from '@prisma/client';

export class UpdateEvidenceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EvidenceStatus, {
    message:
      'Status must be one of: COLLECTED, ANALYZING, IN_CUSTODY, TRANSFERRED, SUBMITTED_TO_COURT, DISPOSED, ARCHIVED',
  })
  status?: EvidenceStatus;
}
