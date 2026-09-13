import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EvidenceService } from './evidence.service';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { QueryEvidenceDto } from './dto/query-evidence.dto';
import { EvidenceAccessGuard } from './guards/evidence-access.guard';

@ApiTags('Evidence & Storage')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post('cases/:caseId/evidence')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload digital evidence file to private S3 and compute SHA-256 hash' })
  @ApiResponse({ status: 201, description: 'Evidence uploaded and custody event logged' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: any,
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadEvidenceDto,
  ) {
    return this.evidenceService.uploadEvidence(req.user.id, caseId, file, dto);
  }

  @Get('cases/:caseId/evidence')
  @ApiOperation({ summary: 'List evidence items assigned to a case' })
  @ApiResponse({ status: 200, description: 'List of evidence items' })
  async findAllForCase(
    @Request() req: any,
    @Param('caseId') caseId: string,
    @Query() query: QueryEvidenceDto,
  ) {
    return this.evidenceService.findAllForCase(req.user.id, caseId, query);
  }

  @UseGuards(EvidenceAccessGuard)
  @Get('evidence/:evidenceId')
  @ApiOperation({ summary: 'Get evidence metadata and current custody status' })
  @ApiResponse({ status: 200, description: 'Evidence item details' })
  async findOne(
    @Request() req: any,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.evidenceService.findOne(req.user.id, evidenceId);
  }

  @UseGuards(EvidenceAccessGuard)
  @Get('evidence/:evidenceId/download')
  @ApiOperation({ summary: 'Download binary evidence file stream' })
  @ApiResponse({ status: 200, description: 'Binary stream response' })
  async download(
    @Request() req: any,
    @Param('evidenceId') evidenceId: string,
    @Res() res: Response,
  ) {
    return this.evidenceService.downloadEvidence(req.user.id, evidenceId, res);
  }

  @UseGuards(EvidenceAccessGuard)
  @Patch('evidence/:evidenceId')
  @ApiOperation({ summary: 'Update evidence metadata' })
  @ApiResponse({ status: 200, description: 'Evidence updated' })
  async update(
    @Request() req: any,
    @Param('evidenceId') evidenceId: string,
    @Body() dto: UpdateEvidenceDto,
  ) {
    return this.evidenceService.update(req.user.id, evidenceId, dto);
  }

  @UseGuards(EvidenceAccessGuard)
  @Delete('evidence/:evidenceId')
  @ApiOperation({ summary: 'Archive or delete evidence record' })
  @ApiResponse({ status: 200, description: 'Evidence archived' })
  async archive(
    @Request() req: any,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.evidenceService.archiveOrDelete(req.user.id, evidenceId);
  }

  @UseGuards(EvidenceAccessGuard)
  @Get('evidence/:evidenceId/custody')
  @ApiOperation({ summary: 'Get immutable chain-of-custody history for an evidence item' })
  @ApiResponse({ status: 200, description: 'Custody history timeline' })
  async getCustodyHistory(
    @Request() req: any,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.evidenceService.getCustodyHistory(req.user.id, evidenceId);
  }

  @UseGuards(EvidenceAccessGuard)
  @Post('evidence/:evidenceId/verify-integrity')
  @ApiOperation({ summary: 'Re-calculate SHA-256 hash from S3 storage and verify against database record' })
  @ApiResponse({ status: 200, description: 'Integrity verification result' })
  async verifyIntegrity(
    @Request() req: any,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.evidenceService.verifyIntegrity(req.user.id, evidenceId);
  }
}
