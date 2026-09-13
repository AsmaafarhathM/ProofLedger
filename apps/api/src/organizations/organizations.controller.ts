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
import { OrgRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { OrgRoles } from './decorators/org-roles.decorator';
import { OrgMemberGuard } from './guards/org-member.guard';

@ApiTags('Organizations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new multi-tenant organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  async create(
    @Request() req: any,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations for the current user' })
  @ApiResponse({ status: 200, description: 'User organization memberships' })
  async findAllForUser(@Request() req: any) {
    return this.organizationsService.findAllForUser(req.user.id);
  }

  @UseGuards(OrgMemberGuard)
  @Get(':organizationId')
  @ApiOperation({ summary: 'Get details of a specific organization' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  async findOne(@Param('organizationId') organizationId: string) {
    return this.organizationsService.findOne(organizationId);
  }

  @UseGuards(OrgMemberGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  @Patch(':organizationId')
  @ApiOperation({ summary: 'Update organization metadata (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  async update(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organizationId, dto);
  }

  @UseGuards(OrgMemberGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  @Post(':organizationId/members')
  @ApiOperation({ summary: 'Add a new member to an organization' })
  @ApiResponse({ status: 201, description: 'Member added' })
  async addMember(
    @Param('organizationId') organizationId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.organizationsService.addMember(organizationId, dto);
  }

  @UseGuards(OrgMemberGuard)
  @Get(':organizationId/members')
  @ApiOperation({ summary: 'List members of an organization' })
  @ApiResponse({ status: 200, description: 'Member list' })
  async listMembers(@Param('organizationId') organizationId: string) {
    return this.organizationsService.listMembers(organizationId);
  }

  @UseGuards(OrgMemberGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  @Delete(':organizationId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from an organization' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.organizationsService.removeMember(
      req.user.id,
      organizationId,
      targetUserId,
    );
  }

  @UseGuards(OrgMemberGuard)
  @Get(':organizationId/audit-logs')
  @ApiOperation({ summary: 'Get paginated audit logs for an organization' })
  @ApiResponse({ status: 200, description: 'Audit log entries' })
  async getAuditLogs(
    @Param('organizationId') organizationId: string,
    @Query() query: import('./dto/query-audit-log.dto').QueryAuditLogDto,
  ) {
    return this.organizationsService.getAuditLogs(organizationId, query);
  }
}
