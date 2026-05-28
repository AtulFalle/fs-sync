import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Provider } from '@prisma/client';
import { PrismaService } from '@org/database';
import { QueueService } from '@org/queue';
import { SyncNowResponseDto, WatchSourceDto } from './dto/api-responses.dto';

@ApiTags('Watch Sources')
@Controller('watch-sources')
export class WatchSourcesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List Google Drive watch sources',
    description:
      'Returns local WatchSource records created during OAuth. Each source stores the current changes.list pageToken and webhook channel metadata.',
  })
  @ApiOkResponse({ type: WatchSourceDto, isArray: true })
  list(@Query('orgId') orgId?: string) {
    return this.prisma.watchSource.findMany({
      where: {
        provider: Provider.google_drive,
        connection: orgId ? { orgId } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post(':id/sync-now')
  @ApiOperation({
    summary: 'Manually enqueue Google Drive sync',
    description:
      'Enqueues google-drive-sync for the WatchSource. The worker uses the saved pageToken and processes one cursor chain sequentially under a Redis lock.',
  })
  @ApiParam({
    name: 'id',
    description: 'WatchSource id.',
    example: 'd2e50266-80db-44bf-aaf7-169d68fa2395',
  })
  @ApiOkResponse({ type: SyncNowResponseDto })
  async syncNow(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Missing watch source id');
    }

    const watchSource = await this.prisma.watchSource.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!watchSource) {
      throw new NotFoundException(`Watch source ${id} does not exist`);
    }

    await this.queues.enqueueGoogleDriveSync(id);
    return { queued: true, watchSourceId: id };
  }
}
