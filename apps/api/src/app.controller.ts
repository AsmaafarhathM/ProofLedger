import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@ApiTags('Health & System')
@Controller()
@SkipThrottle()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Welcome endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'API Server liveness probe' })
  @ApiResponse({ status: 200, description: 'Liveness status' })
  getLiveness() {
    return this.appService.getLiveness();
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'System readiness probe (DB & Storage check)' })
  @ApiResponse({ status: 200, description: 'Readiness status' })
  getReadiness() {
    return this.appService.getReadiness();
  }

  @Get('health/db')
  @ApiOperation({ summary: 'Database connectivity probe' })
  @ApiResponse({ status: 200, description: 'Database status and user count' })
  async getDbHealth() {
    return await this.appService.getUserCount();
  }
}
