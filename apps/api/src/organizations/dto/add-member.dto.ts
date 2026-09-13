import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class AddMemberDto {
  @IsEmail({}, { message: 'Please enter a valid email address for the new member' })
  @IsNotEmpty({ message: 'Member email is required' })
  email: string;

  @IsOptional()
  @IsEnum(OrgRole, { message: 'Role must be one of: OWNER, ADMIN, MEMBER, GUEST' })
  role?: OrgRole = OrgRole.MEMBER;
}
