import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadEvidenceDto {
  @IsString()
  @IsNotEmpty({ message: 'Evidence number is required (e.g., EVD-2026-001)' })
  evidenceNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Evidence title is required' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
