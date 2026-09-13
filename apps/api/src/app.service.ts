import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { StorageService } from './storage/storage.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  getHello(): string {
    return 'ProofLedger API is running!';
  }

  getLiveness() {
    return {
      status: 'ok',
      service: 'ProofLedger API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    };
  }

  async getReadiness() {
    let dbStatus = 'unhealthy';
    let storageStatus = 'unhealthy';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'healthy';
    } catch (e) {
      dbStatus = 'unreachable';
    }

    try {
      const bucketExists = await this.storageService.checkBucketExists();
      storageStatus = bucketExists ? 'healthy' : 'degraded';
    } catch (e) {
      storageStatus = 'unreachable';
    }

    const isReady = dbStatus === 'healthy' && storageStatus === 'healthy';

    return {
      status: isReady ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        storage: storageStatus,
      },
    };
  }

  async getUserCount(): Promise<{ message: string; userCount: number; status: string }> {
    const userCount = await this.prisma.user.count();
    return {
      message: 'Successfully connected to ProofLedger Database via Prisma!',
      userCount,
      status: 'healthy',
    };
  }
}
