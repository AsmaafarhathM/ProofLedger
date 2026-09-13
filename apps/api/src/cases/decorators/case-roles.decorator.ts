import { SetMetadata } from '@nestjs/common';
import { CaseRole } from '@prisma/client';

export const CASE_ROLES_KEY = 'case_roles';
export const CaseRoles = (...roles: CaseRole[]) =>
  SetMetadata(CASE_ROLES_KEY, roles);
