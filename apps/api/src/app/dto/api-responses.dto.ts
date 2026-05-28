import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'Demo Org' })
  name!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class OAuthUrlResponseDto {
  @ApiProperty({
    description:
      'Google OAuth consent URL with readonly Drive scopes and offline access.',
    example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  })
  url!: string;

  @ApiProperty({
    description:
      'Signed state that carries orgId and expires after 15 minutes.',
    example: 'eyJvcm...signature',
  })
  state!: string;
}

export class GoogleDriveOAuthCallbackResponseDto {
  @ApiProperty({ example: '4f4193ea-39c1-4d8f-8dd1-55f6a70a4411' })
  connectionId!: string;

  @ApiProperty({ example: 'd2e50266-80db-44bf-aaf7-169d68fa2395' })
  watchSourceId!: string;

  @ApiPropertyOptional({
    description: 'Google channel expiration timestamp when Google returns one.',
    format: 'date-time',
    nullable: true,
  })
  expiresAt?: Date | null;
}

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class WatchSourceDto {
  @ApiProperty({ example: 'd2e50266-80db-44bf-aaf7-169d68fa2395' })
  id!: string;

  @ApiProperty({ example: '4f4193ea-39c1-4d8f-8dd1-55f6a70a4411' })
  connectionId!: string;

  @ApiProperty({ example: 'google_drive' })
  provider!: string;

  @ApiProperty({ enum: ['user_drive', 'shared_drive'], example: 'user_drive' })
  sourceType!: string;

  @ApiProperty({ example: 'me' })
  externalSourceId!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  driveId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  rootFolderId?: string | null;

  @ApiProperty({
    description: 'Saved Google Drive changes cursor.',
    example: '12345',
  })
  pageToken!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '4f8ad3f9-b638-4a59-b0bc-a08eea1de83b',
  })
  channelId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'V1G9Uf...' })
  resourceId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-05-25T12:00:00.000Z' })
  expiresAt?: Date | null;

  @ApiProperty({
    enum: ['active', 'expired', 'stopped', 'error'],
    example: 'active',
  })
  status!: string;
}

export class GoogleDriveBrowserItemDto {
  @ApiProperty({ example: '1m7Q7cUeV2...' })
  id!: string;

  @ApiProperty({ example: 'Invoices' })
  name!: string;

  @ApiProperty({ example: 'application/vnd.google-apps.folder' })
  mimeType!: string;

  @ApiProperty({ example: true })
  isFolder!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'https://drive.google.com/...' })
  webViewLink?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  modifiedAt?: Date | null;
}

export class GoogleDriveBrowserResponseDto {
  @ApiProperty({ example: '4f4193ea-39c1-4d8f-8dd1-55f6a70a4411' })
  connectionId!: string;

  @ApiProperty({ example: 'd2e50266-80db-44bf-aaf7-169d68fa2395' })
  watchSourceId!: string;

  @ApiPropertyOptional({ nullable: true, example: 'root' })
  parentId?: string | null;

  @ApiProperty({ type: GoogleDriveBrowserItemDto, isArray: true })
  items!: GoogleDriveBrowserItemDto[];
}

export class SyncNowResponseDto {
  @ApiProperty({ example: true })
  queued!: boolean;

  @ApiProperty({ example: 'd2e50266-80db-44bf-aaf7-169d68fa2395' })
  watchSourceId!: string;
}

export class FileMetadataDto {
  @ApiProperty({ example: 'dc5b4f48-2516-4526-8f53-f25fe77c2e9d' })
  id!: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  orgId!: string;

  @ApiProperty({ example: 'd2e50266-80db-44bf-aaf7-169d68fa2395' })
  watchSourceId!: string;

  @ApiProperty({ example: 'google_drive' })
  provider!: string;

  @ApiProperty({ example: '1m7Q7cUeV2...' })
  providerFileId!: string;

  @ApiProperty({ example: 'Quarterly Plan.pdf' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: 'root-folder-id' })
  parentProviderId?: string | null;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiPropertyOptional({ nullable: true, example: '245880' })
  sizeBytes?: string | null;

  @ApiProperty({ example: false })
  isFolder!: boolean;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  deletedAt?: Date | null;

  @ApiProperty({ example: false })
  trashed!: boolean;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  modifiedAt?: Date | null;

  @ApiProperty({
    enum: ['not_requested', 'queued', 'stored', 'failed', 'skipped'],
  })
  downloadStatus!: string;
}

export class DownloadRequestResponseDto {
  @ApiProperty({ example: 'c0f3d472-693c-478c-8be5-f8f548daed2c' })
  downloadJobId!: string;

  @ApiProperty({
    description:
      'False when the caller explicitly disables the deferred download job.',
    example: true,
  })
  queued!: boolean;
}
