import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma, Provider } from '@prisma/client';
import { PrismaService } from '@org/database';
import { QueueService } from '@org/queue';
import { GoogleDriveWebhookPayloadDto } from '../dto/api-requests.dto';
import { OkResponseDto } from '../dto/api-responses.dto';

type HeaderValue = string | string[] | undefined;

@ApiTags('Google Drive Webhooks')
@Controller('webhooks/google-drive')
export class GoogleDriveWebhookController {
  private readonly logger = new Logger(GoogleDriveWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive Google Drive watch notification',
    description:
      'Returns quickly after validating X-Goog-* headers, storing RawProviderEvent, and enqueueing google-drive-sync. The body may be empty and is not the source of truth; workers call changes.list using the saved pageToken.',
  })
  @ApiHeader({
    name: 'X-Goog-Channel-ID',
    description: 'Google channel id created by changes.watch.',
    required: true,
  })
  @ApiHeader({
    name: 'X-Goog-Resource-ID',
    description: 'Google resource id returned when the channel was created.',
    required: true,
  })
  @ApiHeader({
    name: 'X-Goog-Resource-State',
    description: 'State such as sync, add, update, remove, or trash.',
    required: false,
  })
  @ApiHeader({
    name: 'X-Goog-Channel-Token',
    description:
      'Opaque channel token used to reject stale or unknown channels.',
    required: false,
  })
  @ApiHeader({
    name: 'X-Goog-Message-Number',
    description: 'Google notification sequence number.',
    required: false,
  })
  @ApiOkResponse({
    type: OkResponseDto,
    description:
      'Always returns 200 for malformed, unknown, or stale channels so Google does not retry noisy notifications forever.',
  })
  async receive(
    @Headers() headers: Record<string, HeaderValue>,
    @Body() body: GoogleDriveWebhookPayloadDto | unknown,
  ) {
    const channelId = firstHeader(headers['x-goog-channel-id']);
    const resourceId = firstHeader(headers['x-goog-resource-id']);
    const resourceState =
      firstHeader(headers['x-goog-resource-state']) ?? 'unknown';
    const channelToken = firstHeader(headers['x-goog-channel-token']);
    const messageNumber = firstHeader(headers['x-goog-message-number']);

    if (!channelId || !resourceId) {
      this.logger.warn(
        'Ignored malformed Google Drive webhook without channel/resource headers',
      );
      return { ok: true };
    }

    const watchSource = await this.prisma.watchSource.findFirst({
      where: {
        provider: Provider.google_drive,
        channelId,
        resourceId,
        status: 'active',
      },
    });

    if (!watchSource || watchSource.channelToken !== channelToken) {
      this.logger.warn(
        `Ignored unknown or stale Google Drive channel ${channelId}`,
      );
      return { ok: true };
    }

    const rawEvent = await this.prisma.rawProviderEvent.create({
      data: {
        watchSourceId: watchSource.id,
        provider: Provider.google_drive,
        eventType: resourceState,
        eventId: messageNumber ?? null,
        headers: normalizeHeaders(headers),
        rawPayload: isJsonObject(body)
          ? (body as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    await this.queues.enqueueGoogleDriveSync(watchSource.id);

    await this.prisma.rawProviderEvent.update({
      where: { id: rawEvent.id },
      data: { processedAt: new Date() },
    });

    return { ok: true };
  }
}

function firstHeader(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeHeaders(
  headers: Record<string, HeaderValue>,
): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      (entry): entry is [string, string | string[]] => {
        return typeof entry[1] === 'string' || Array.isArray(entry[1]);
      },
    ),
  );
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
