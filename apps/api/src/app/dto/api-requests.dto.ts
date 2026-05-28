import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class SelectSyncScopeDto {
  @ApiProperty({
    description: 'Google Drive folder id selected by the user.',
    example: '1m7Q7cUeV2abcFolderId',
  })
  folderId!: string;

  @ApiProperty({
    description: 'Selected folder display name for API responses/UI context.',
    example: 'Invoices',
  })
  folderName!: string;

  @ApiPropertyOptional({
    description: 'Include nested folders when this scope is used for sync.',
    example: true,
  })
  includeSubfolders?: boolean;
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
