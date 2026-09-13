import { Module } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { UsersModule } from '../users/users.module';
import { CaseAccessGuard } from './guards/case-access.guard';

@Module({
  imports: [UsersModule],
  controllers: [CasesController],
  providers: [CasesService, CaseAccessGuard],
  exports: [CasesService],
})
export class CasesModule {}
