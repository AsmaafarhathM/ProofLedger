import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { StorageService } from './storage/storage.service';

describe('AppController', () => {
  let appController: AppController;

  const mockPrismaService = {
    user: {
      count: jest.fn().mockResolvedValue(5),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  const mockStorageService = {
    checkBucketExists: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('Health Probes', () => {
    it('should return welcome hello message', () => {
      expect(appController.getHello()).toBe('ProofLedger API is running!');
    });

    it('should return API server liveness status', () => {
      const res = appController.getLiveness();
      expect(res.status).toBe('ok');
      expect(res.service).toBe('ProofLedger API');
      expect(typeof res.uptimeSeconds).toBe('number');
    });

    it('should return system readiness status (DB & Storage healthy)', async () => {
      const res = await appController.getReadiness();
      expect(res.status).toBe('healthy');
      expect(res.checks.database).toBe('healthy');
      expect(res.checks.storage).toBe('healthy');
    });

    it('should return database health status and user count', async () => {
      const res = await appController.getDbHealth();
      expect(res.status).toBe('healthy');
      expect(res.userCount).toBe(5);
    });
  });
});
