import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@org/database';
import { CreateOrganizationDto } from './dto/api-requests.dto';
import { OrganizationDto } from './dto/api-responses.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an organization',
    description:
      'Creates a local organization record. Authentication is intentionally skipped for this phase, so use this orgId when starting Google Drive OAuth.',
  })
  @ApiCreatedResponse({ type: OrganizationDto })
  async create(@Body() body: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: body.name?.trim() || 'Default Organization',
      },
    });
  }
}
