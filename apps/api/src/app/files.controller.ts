import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Provider } from '@prisma/client';
import { PrismaService } from '@org/database';
import { QueueService } from '@org/queue';
import { RequestFileDownloadDto } from './dto/api-requests.dto';
import {
  DownloadRequestResponseDto,
  FileMetadataDto,
} from './dto/api-responses.dto';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List synced file metadata',
    description:
      'Returns the latest 100 Google Drive FileMetadata rows for a WatchSource. Metadata sync is separate from file download.',
  })
  @ApiQuery({
    name: 'watchSourceId',
    description: 'WatchSource id whose synced metadata should be listed.',
    example: 'd2e50266-80db-44bf-aaf7-169d68fa2395',
  })
  @ApiOkResponse({ type: FileMetadataDto, isArray: true })
  async list(@Query('watchSourceId') watchSourceId: string) {
    if (!watchSourceId) {
      throw new BadRequestException('Missing watchSourceId');
    }

    const watchSource = await this.prisma.watchSource.findUnique({
      where: { id: watchSourceId },
      select: { id: true },
    });

    if (!watchSource) {
      throw new NotFoundException(`Watch source ${watchSourceId} does not exist`);
    }

    return this.prisma.fileMetadata.findMany({
      where: {
        watchSourceId,
        provider: Provider.google_drive,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one synced file metadata row',
    description:
      'Fetches a FileMetadata record by internal id. The providerFileId is the Google Drive file id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal FileMetadata id.',
    example: 'dc5b4f48-2516-4526-8f53-f25fe77c2e9d',
  })
  @ApiOkResponse({ type: FileMetadataDto })
  @ApiNotFoundResponse({
    description: 'No FileMetadata row exists for the given id.',
  })
  async get(@Param('id') id: string) {
    const file = await this.prisma.fileMetadata.findUnique({ where: { id } });

    if (!file) {
      throw new NotFoundException(`File metadata ${id} does not exist`);
    }

    return file;
  }

  @Post(':id/download')
  @ApiOperation({
    summary: 'Create deferred download job request',
    description:
      'Creates a DownloadJob and optionally enqueues download-file. Actual file download and object storage are intentionally deferred for the next implementation phase.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal FileMetadata id.',
    example: 'dc5b4f48-2516-4526-8f53-f25fe77c2e9d',
  })
  @ApiBody({ type: RequestFileDownloadDto, required: false })
  @ApiOkResponse({ type: DownloadRequestResponseDto })
  @ApiNotFoundResponse({
    description: 'No FileMetadata row exists for the given id.',
  })
  async requestDownload(
    @Param('id') id: string,
    @Body() body: RequestFileDownloadDto,
  ) {
    const file = await this.prisma.fileMetadata.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File metadata ${id} does not exist`);
    }

    const downloadJob = await this.prisma.downloadJob.create({
      data: {
        fileMetadataId: file.id,
        provider: Provider.google_drive,
        providerFileId: file.providerFileId,
      },
    });

    await this.prisma.fileMetadata.update({
      where: { id },
      data: { downloadStatus: body.enabled === false ? 'skipped' : 'queued' },
    });

    if (body.enabled !== false) {
      await this.queues.enqueueDownloadFile(file.id);
    }

    return { downloadJobId: downloadJob.id, queued: body.enabled !== false };
  }
}
