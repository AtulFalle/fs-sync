-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('google_drive');

-- CreateEnum
CREATE TYPE "ProviderConnectionStatus" AS ENUM ('active', 'disconnected', 'error');

-- CreateEnum
CREATE TYPE "WatchSourceType" AS ENUM ('user_drive', 'shared_drive');

-- CreateEnum
CREATE TYPE "WatchSourceStatus" AS ENUM ('active', 'expired', 'stopped', 'error');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('not_requested', 'queued', 'stored', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "DownloadJobStatus" AS ENUM ('queued', 'running', 'stored', 'failed');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConnection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL DEFAULT 'google_drive',
    "name" TEXT NOT NULL,
    "credentialsRef" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "ProviderConnectionStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchSource" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL DEFAULT 'google_drive',
    "sourceType" "WatchSourceType" NOT NULL DEFAULT 'user_drive',
    "externalSourceId" TEXT NOT NULL,
    "driveId" TEXT,
    "rootFolderId" TEXT,
    "pageToken" TEXT NOT NULL,
    "channelId" TEXT,
    "resourceId" TEXT,
    "channelToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "WatchSourceStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncScope" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "watchSourceId" TEXT NOT NULL,
    "folderIdOrPrefix" TEXT NOT NULL,
    "includeSubfolders" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileMetadata" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "watchSourceId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL DEFAULT 'google_drive',
    "providerFileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "parentProviderId" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "md5Checksum" TEXT,
    "version" TEXT,
    "webViewLink" TEXT,
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "trashed" BOOLEAN NOT NULL DEFAULT false,
    "modifiedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadStatus" "DownloadStatus" NOT NULL DEFAULT 'not_requested',
    "objectStorageKey" TEXT,
    "providerRaw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawProviderEvent" (
    "id" TEXT NOT NULL,
    "watchSourceId" TEXT,
    "provider" "Provider" NOT NULL DEFAULT 'google_drive',
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "headers" JSONB NOT NULL,
    "rawPayload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "RawProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadJob" (
    "id" TEXT NOT NULL,
    "fileMetadataId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL DEFAULT 'google_drive',
    "providerFileId" TEXT NOT NULL,
    "status" "DownloadJobStatus" NOT NULL DEFAULT 'queued',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownloadJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderConnection_orgId_idx" ON "ProviderConnection"("orgId");

-- CreateIndex
CREATE INDEX "WatchSource_channelId_idx" ON "WatchSource"("channelId");

-- CreateIndex
CREATE INDEX "WatchSource_resourceId_idx" ON "WatchSource"("resourceId");

-- CreateIndex
CREATE INDEX "WatchSource_expiresAt_idx" ON "WatchSource"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchSource_provider_channelId_key" ON "WatchSource"("provider", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchSource_provider_resourceId_key" ON "WatchSource"("provider", "resourceId");

-- CreateIndex
CREATE INDEX "SyncScope_watchSourceId_enabled_idx" ON "SyncScope"("watchSourceId", "enabled");

-- CreateIndex
CREATE INDEX "FileMetadata_orgId_watchSourceId_idx" ON "FileMetadata"("orgId", "watchSourceId");

-- CreateIndex
CREATE INDEX "FileMetadata_watchSourceId_providerFileId_idx" ON "FileMetadata"("watchSourceId", "providerFileId");

-- CreateIndex
CREATE INDEX "FileMetadata_watchSourceId_parentProviderId_idx" ON "FileMetadata"("watchSourceId", "parentProviderId");

-- CreateIndex
CREATE INDEX "FileMetadata_watchSourceId_deletedAt_idx" ON "FileMetadata"("watchSourceId", "deletedAt");

-- CreateIndex
CREATE INDEX "FileMetadata_mimeType_idx" ON "FileMetadata"("mimeType");

-- CreateIndex
CREATE UNIQUE INDEX "FileMetadata_watchSourceId_providerFileId_key" ON "FileMetadata"("watchSourceId", "providerFileId");

-- CreateIndex
CREATE INDEX "RawProviderEvent_watchSourceId_idx" ON "RawProviderEvent"("watchSourceId");

-- CreateIndex
CREATE INDEX "RawProviderEvent_receivedAt_idx" ON "RawProviderEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "DownloadJob_fileMetadataId_idx" ON "DownloadJob"("fileMetadataId");

-- CreateIndex
CREATE INDEX "DownloadJob_status_idx" ON "DownloadJob"("status");

-- AddForeignKey
ALTER TABLE "ProviderConnection" ADD CONSTRAINT "ProviderConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchSource" ADD CONSTRAINT "WatchSource_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProviderConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncScope" ADD CONSTRAINT "SyncScope_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncScope" ADD CONSTRAINT "SyncScope_watchSourceId_fkey" FOREIGN KEY ("watchSourceId") REFERENCES "WatchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMetadata" ADD CONSTRAINT "FileMetadata_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMetadata" ADD CONSTRAINT "FileMetadata_watchSourceId_fkey" FOREIGN KEY ("watchSourceId") REFERENCES "WatchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProviderEvent" ADD CONSTRAINT "RawProviderEvent_watchSourceId_fkey" FOREIGN KEY ("watchSourceId") REFERENCES "WatchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadJob" ADD CONSTRAINT "DownloadJob_fileMetadataId_fkey" FOREIGN KEY ("fileMetadataId") REFERENCES "FileMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
