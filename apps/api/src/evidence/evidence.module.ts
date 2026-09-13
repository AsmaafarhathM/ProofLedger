import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceController } from './evidence.controller';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';
import { EvidenceAccessGuard } from './guards/evidence-access.guard';

@Module({
  imports: [UsersModule, StorageModule],
  controllers: [EvidenceController],
  providers: [EvidenceService, EvidenceAccessGuard],
  exports: [EvidenceService],
})
export class EvidenceModule {}
