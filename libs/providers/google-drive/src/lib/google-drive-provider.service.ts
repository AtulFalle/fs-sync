import { Injectable, Logger } from '@nestjs/common';
import {
  decryptSecret,
  encryptSecret,
  GOOGLE_DRIVE_CHANGE_FIELDS,
  GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  GOOGLE_DRIVE_OAUTH_SCOPES,
  GOOGLE_EXPORT_MIME_TYPES,
  optionalEnv,
  requiredEnv,
} from '@org/common';
import { PrismaService } from '@org/database';
import { NormalizedFileMetadata } from '@org/metadata';
import { Prisma } from '@prisma/client';
import { drive_v3, google } from 'googleapis';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'node:crypto';

@Injectable()
export class GoogleDriveProviderService {
  private readonly logger = new Logger(GoogleDriveProviderService.name);

  constructor(private readonly prisma: PrismaService) {}

  createOAuthUrl(state: string): string {
    const client = this.createOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [...GOOGLE_DRIVE_OAUTH_SCOPES],
      state,
    });
  }

  async exchangeCodeForTokens(code: string): Promise<Credentials> {
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  async refreshAccessToken(connectionId: string): Promise<void> {
    const connection = await this.prisma.providerConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });

    if (!connection.refreshTokenEncrypted) {
      throw new Error(`Connection ${connectionId} has no refresh token`);
    }

    const client = this.createOAuthClient();
    client.setCredentials({
      refresh_token: decryptSecret(connection.refreshTokenEncrypted),
    });
    const { credentials } = await client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error(
        `Google did not return an access token for ${connectionId}`,
      );
    }

    await this.prisma.providerConnection.update({
      where: { id: connectionId },
      data: {
        accessTokenEncrypted: encryptSecret(credentials.access_token),
        refreshTokenEncrypted: credentials.refresh_token
          ? encryptSecret(credentials.refresh_token)
          : connection.refreshTokenEncrypted,
        tokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      },
    });
  }

  async getDriveClient(connectionId: string): Promise<drive_v3.Drive> {
    const auth = await this.getAuthorizedClient(connectionId);
    return google.drive({ version: 'v3', auth });
  }

  async getStartPageToken(
    connectionId: string,
    driveId?: string,
  ): Promise<string> {
    const drive = await this.getDriveClient(connectionId);
    const response = await drive.changes.getStartPageToken({
      driveId,
      supportsAllDrives: true,
    });
    if (!response.data.startPageToken) {
      throw new Error('Google Drive did not return startPageToken');
    }
    return response.data.startPageToken;
  }

  async watchChanges(
    connectionId: string,
    watchSourceId: string,
  ): Promise<{
    channelId: string;
    resourceId: string;
    channelToken: string;
    expiresAt: Date | null;
  }> {
    const watchSource = await this.prisma.watchSource.findUniqueOrThrow({
      where: { id: watchSourceId },
      select: { pageToken: true, driveId: true },
    });
    const drive = await this.getDriveClient(connectionId);
    const channelId = randomUUID();
    const channelToken = randomUUID();

    const response = await drive.changes.watch({
      pageToken: watchSource.pageToken,
      driveId: watchSource.driveId ?? undefined,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: requiredEnv('GOOGLE_DRIVE_WEBHOOK_URL'),
        token: channelToken,
      },
    });

    if (!response.data.resourceId) {
      throw new Error('Google Drive watch did not return resourceId');
    }

    return {
      channelId,
      resourceId: response.data.resourceId,
      channelToken,
      expiresAt: response.data.expiration
        ? new Date(Number(response.data.expiration))
        : null,
    };
  }

  async listChanges(
    connectionId: string,
    pageToken: string,
    driveId?: string,
  ): Promise<drive_v3.Schema$ChangeList> {
    const drive = await this.getDriveClient(connectionId);
    const response = await drive.changes.list({
      pageToken,
      driveId,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: Number(optionalEnv('GOOGLE_DRIVE_CHANGES_PAGE_SIZE', '100')),
      fields: GOOGLE_DRIVE_CHANGE_FIELDS,
    });
    return response.data;
  }

  async getFileMetadata(
    connectionId: string,
    fileId: string,
  ): Promise<drive_v3.Schema$File> {
    const drive = await this.getDriveClient(connectionId);
    const response = await drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields:
        'id,name,mimeType,size,md5Checksum,parents,trashed,modifiedTime,webViewLink,version',
    });
    return response.data;
  }

  async downloadBlobFile(
    connectionId: string,
    fileId: string,
  ): Promise<unknown> {
    const drive = await this.getDriveClient(connectionId);
    return drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );
  }

  async exportGoogleWorkspaceFile(
    connectionId: string,
    fileId: string,
    mimeType: string,
  ): Promise<unknown> {
    const exportMimeType =
      GOOGLE_EXPORT_MIME_TYPES[mimeType] ?? 'application/pdf';
    const drive = await this.getDriveClient(connectionId);
    return drive.files.export(
      { fileId, mimeType: exportMimeType },
      { responseType: 'stream' },
    );
  }

  async stopChannel(
    connectionId: string,
    channelId: string,
    resourceId: string,
  ): Promise<void> {
    const drive = await this.getDriveClient(connectionId);
    await drive.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });
  }

  normalizeFile(file: drive_v3.Schema$File): NormalizedFileMetadata {
    if (!file.id || !file.name || !file.mimeType) {
      throw new Error('Google Drive file missing id, name, or mimeType');
    }

    const parents = file.parents?.filter(Boolean) ?? [];
    return {
      providerFileId: file.id,
      name: file.name,
      parentProviderId: parents[0] ?? null,
      mimeType: file.mimeType,
      sizeBytes: file.size ? BigInt(file.size) : null,
      md5Checksum: file.md5Checksum ?? null,
      version: file.version ?? null,
      webViewLink: file.webViewLink ?? null,
      isFolder: file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE,
      trashed: file.trashed ?? false,
      modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
      providerRaw: JSON.parse(JSON.stringify(file)) as Prisma.InputJsonValue,
      parents,
    };
  }

  private async getAuthorizedClient(
    connectionId: string,
  ): Promise<OAuth2Client> {
    const connection = await this.prisma.providerConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });

    if (
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt.getTime() < Date.now() + 60_000 &&
      connection.refreshTokenEncrypted
    ) {
      this.logger.debug(
        `Refreshing near-expiry Google token for ${connectionId}`,
      );
      await this.refreshAccessToken(connectionId);
      return this.getAuthorizedClient(connectionId);
    }

    const client = this.createOAuthClient();
    client.setCredentials({
      access_token: decryptSecret(connection.accessTokenEncrypted),
      refresh_token: connection.refreshTokenEncrypted
        ? decryptSecret(connection.refreshTokenEncrypted)
        : undefined,
      expiry_date: connection.tokenExpiresAt?.getTime(),
    });
    return client;
  }

  private createOAuthClient(): OAuth2Client {
    return new google.auth.OAuth2(
      requiredEnv('GOOGLE_CLIENT_ID'),
      requiredEnv('GOOGLE_CLIENT_SECRET'),
      requiredEnv('GOOGLE_REDIRECT_URI'),
    );
  }
}
