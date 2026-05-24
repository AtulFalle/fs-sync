import { Injectable } from '@nestjs/common';
import { Prisma, Provider } from '@prisma/client';
import { GOOGLE_DRIVE_FOLDER_MIME_TYPE } from '@org/common';
import { PrismaService } from '@org/database';

export interface NormalizedFileMetadata {
  providerFileId: string;
  name: string;
  parentProviderId: string | null;
  mimeType: string;
  sizeBytes: bigint | null;
  md5Checksum: string | null;
  version: string | null;
  webViewLink: string | null;
  isFolder: boolean;
  trashed: boolean;
  modifiedAt: Date | null;
  providerRaw: Prisma.InputJsonValue;
  parents: string[];
}

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

  async markRemoved(
    watchSourceId: string,
    providerFileId: string,
  ): Promise<void> {
    await this.prisma.fileMetadata.updateMany({
      where: { watchSourceId, providerFileId, provider: Provider.google_drive },
      data: {
        deletedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });
  }

  async upsertGoogleDriveFile(params: {
    orgId: string;
    watchSourceId: string;
    file: NormalizedFileMetadata;
  }) {
    const { orgId, watchSourceId, file } = params;
    return this.prisma.fileMetadata.upsert({
      where: {
        watchSourceId_providerFileId: {
          watchSourceId,
          providerFileId: file.providerFileId,
        },
      },
      create: {
        orgId,
        watchSourceId,
        provider: Provider.google_drive,
        providerFileId: file.providerFileId,
        name: file.name,
        parentProviderId: file.parentProviderId,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        md5Checksum: file.md5Checksum,
        version: file.version,
        webViewLink: file.webViewLink,
        isFolder: file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE,
        trashed: file.trashed,
        modifiedAt: file.modifiedAt,
        providerRaw: file.providerRaw,
        deletedAt: null,
        lastSyncedAt: new Date(),
      },
      update: {
        name: file.name,
        parentProviderId: file.parentProviderId,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        md5Checksum: file.md5Checksum,
        version: file.version,
        webViewLink: file.webViewLink,
        isFolder: file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE,
        trashed: file.trashed,
        modifiedAt: file.modifiedAt,
        providerRaw: file.providerRaw,
        deletedAt: null,
        lastSyncedAt: new Date(),
      },
    });
  }

  async matchesScopes(
    watchSourceId: string,
    file: NormalizedFileMetadata,
  ): Promise<boolean> {
    const scopes = await this.prisma.syncScope.findMany({
      where: { watchSourceId, enabled: true },
      select: { folderIdOrPrefix: true, includeSubfolders: true },
    });

    if (scopes.length === 0) {
      return true;
    }

    return scopes.some(
      (scope: { folderIdOrPrefix: string; includeSubfolders: boolean }) => {
        if (file.providerFileId === scope.folderIdOrPrefix) {
          return true;
        }
        if (file.parents.includes(scope.folderIdOrPrefix)) {
          return true;
        }
        return (
          scope.includeSubfolders &&
          file.parentProviderId === scope.folderIdOrPrefix
        );
      },
    );
  }
}
