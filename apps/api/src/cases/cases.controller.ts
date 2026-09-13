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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CaseRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { AddCaseMemberDto } from './dto/add-case-member.dto';
import { QueryCaseDto } from './dto/query-case.dto';
import { CaseRoles } from './decorators/case-roles.decorator';
import { CaseAccessGuard } from './guards/case-access.guard';

@ApiTags('Cases')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post('organizations/:organizationId/cases')
  @ApiOperation({ summary: 'Create an investigation case in an organization' })
  @ApiResponse({ status: 201, description: 'Case created' })
  async create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateCaseDto,
  ) {
    return this.casesService.create(req.user.id, organizationId, dto);
  }

  @Get('organizations/:organizationId/cases')
  @ApiOperation({ summary: 'List cases for an organization' })
  @ApiResponse({ status: 200, description: 'List of cases' })
  async findAllForOrg(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Query() query: QueryCaseDto,
  ) {
    return this.casesService.findAllForOrg(req.user.id, organizationId, query);
  }

  @UseGuards(CaseAccessGuard)
  @Get('cases/:caseId')
  @ApiOperation({ summary: 'Get case details by ID' })
  @ApiResponse({ status: 200, description: 'Case details' })
  async findOne(
    @Request() req: any,
    @Param('caseId') caseId: string,
  ) {
    return this.casesService.findOne(req.user.id, caseId);
  }

  @UseGuards(CaseAccessGuard)
  @CaseRoles(CaseRole.LEAD_INVESTIGATOR)
  @Patch('cases/:caseId')
  @ApiOperation({ summary: 'Update case details (Lead Investigator / Admin only)' })
  @ApiResponse({ status: 200, description: 'Case updated' })
  async update(
    @Param('caseId') caseId: string,
    @Body() dto: UpdateCaseDto,
  ) {
    return this.casesService.update(caseId, dto);
  }

  @UseGuards(CaseAccessGuard)
  @CaseRoles(CaseRole.LEAD_INVESTIGATOR)
  @Delete('cases/:caseId')
  @ApiOperation({ summary: 'Close / Archive case' })
  @ApiResponse({ status: 200, description: 'Case archived' })
  async remove(@Param('caseId') caseId: string) {
    return this.casesService.remove(caseId);
  }

  @UseGuards(CaseAccessGuard)
  @CaseRoles(CaseRole.LEAD_INVESTIGATOR)
  @Post('cases/:caseId/members')
  @ApiOperation({ summary: 'Add an investigator to a case' })
  @ApiResponse({ status: 201, description: 'Case member added' })
  async addMember(
    @Param('caseId') caseId: string,
    @Body() dto: AddCaseMemberDto,
  ) {
    return this.casesService.addMember(caseId, dto);
  }

  @UseGuards(CaseAccessGuard)
  @Get('cases/:caseId/members')
  @ApiOperation({ summary: 'List members assigned to a case' })
  @ApiResponse({ status: 200, description: 'List of case members' })
  async listMembers(@Param('caseId') caseId: string) {
    return this.casesService.listMembers(caseId);
  }

  @UseGuards(CaseAccessGuard)
  @CaseRoles(CaseRole.LEAD_INVESTIGATOR)
  @Delete('cases/:caseId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a case' })
  @ApiResponse({ status: 200, description: 'Case member removed' })
  async removeMember(
    @Request() req: any,
    @Param('caseId') caseId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.casesService.removeMember(req.user.id, caseId, targetUserId);
  }
}
