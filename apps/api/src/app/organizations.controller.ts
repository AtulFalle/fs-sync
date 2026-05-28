import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '@org/database';
import { CreateOrganizationDto } from './dto/api-requests.dto';
import { OrganizationDto } from './dto/api-responses.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get an organization',
    description:
      'Returns a local organization record by id. Used by the demo UI to recover cleanly after local database resets.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization id.',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @ApiOkResponse({ type: OrganizationDto })
  @ApiNotFoundResponse({
    description: 'No organization exists for the given id.',
  })
  async get(@Param('id') id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} does not exist`);
    }

    return organization;
  }

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
