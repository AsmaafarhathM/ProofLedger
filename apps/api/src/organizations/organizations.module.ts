import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { UsersModule } from '../users/users.module';
import { OrgMemberGuard } from './guards/org-member.guard';

@Module({
  imports: [UsersModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgMemberGuard],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
