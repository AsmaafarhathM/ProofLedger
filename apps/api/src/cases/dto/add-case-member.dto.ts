import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { CaseRole } from '@prisma/client';

export class AddCaseMemberDto {
  @IsEmail({}, { message: 'Please enter a valid email address for the case member' })
  @IsNotEmpty({ message: 'Member email is required' })
  email: string;

  @IsOptional()
  @IsEnum(CaseRole, {
    message: 'Role must be one of: LEAD_INVESTIGATOR, INVESTIGATOR, REVIEWER, VIEWER',
  })
  role?: CaseRole = CaseRole.INVESTIGATOR;
}
