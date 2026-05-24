import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiPropertyOptional({
    description:
      'Organization display name. Falls back to "Default Organization" when omitted.',
    example: 'Demo Org',
  })
  name?: string;
}

export class RequestFileDownloadDto {
  @ApiPropertyOptional({
    description:
      'Set false to create a DownloadJob record but skip queueing. Actual object storage is intentionally deferred.',
    example: true,
  })
  enabled?: boolean;
}

export class GoogleDriveWebhookPayloadDto {
  @ApiPropertyOptional({
    description:
      'Google Drive webhooks usually send an empty body. The API stores JSON payloads defensively when present.',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  payload?: Record<string, unknown> | null;
}
