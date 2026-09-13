import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Organization slug is required' })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug must contain only lowercase letters, numbers, and hyphens (e.g. cyber-forensics-lab)',
  })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;
}
