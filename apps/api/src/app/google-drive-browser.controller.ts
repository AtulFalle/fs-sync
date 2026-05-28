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
import { GOOGLE_DRIVE_FOLDER_MIME_TYPE } from '@org/common';
import { PrismaService } from '@org/database';
import { GoogleDriveProviderService } from '@org/google-drive';
import { Provider } from '@prisma/client';
import { SelectSyncScopeDto } from './dto/api-requests.dto';
import {
  GoogleDriveBrowserResponseDto,
  WatchSourceDto,
} from './dto/api-responses.dto';

@ApiTags('Google Drive Browser')
@Controller('google-drive/browser')
export class GoogleDriveBrowserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDrive: GoogleDriveProviderService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Browse connected Google Drive files and folders',
    description:
      'Returns immediate children for a folder from the latest active Google Drive connection in an organization. Use parentId=root for My Drive root.',
  })
  @ApiQuery({
    name: 'orgId',
    description: 'Organization id with a connected Google Drive account.',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Google Drive folder id. Defaults to root.',
    example: 'root',
  })
  @ApiOkResponse({ type: GoogleDriveBrowserResponseDto })
  @ApiNotFoundResponse({
    description: 'No active Google Drive connection exists for the org.',
  })
  async list(
    @Query('orgId') orgId: string,
    @Query('parentId') parentId?: string,
  ) {
    if (!orgId) {
      throw new BadRequestException('Missing orgId');
    }

    const connection = await this.prisma.providerConnection.findFirst({
      where: {
        orgId,
        provider: Provider.google_drive,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        watchSources: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!connection || connection.watchSources.length === 0) {
      throw new NotFoundException(
        'Connect Google Drive before browsing folders and files.',
      );
    }

    const resolvedParentId = parentId || 'root';
    const response = await this.googleDrive.listFolderChildren(
      connection.id,
      resolvedParentId,
    );

    return {
      connectionId: connection.id,
      watchSourceId: connection.watchSources[0].id,
      parentId: resolvedParentId,
      items: (response.files ?? [])
        .filter((file) => file.id && file.name && file.mimeType)
        .map((file) => ({
          id: file.id as string,
          name: file.name as string,
          mimeType: file.mimeType as string,
          isFolder: file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE,
          webViewLink: file.webViewLink ?? null,
          modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
        })),
    };
  }

  @Post('watch-sources/:id/scope')
  @ApiOperation({
    summary: 'Save the selected Google Drive folder as the sync scope',
    description:
      'Persists the folder chosen in the browser UI. Future watch/sync implementation can use this folder scope.',
  })
  @ApiParam({
    name: 'id',
    description: 'WatchSource id created during Google Drive connection.',
  })
  @ApiBody({ type: SelectSyncScopeDto })
  @ApiOkResponse({ type: WatchSourceDto })
  async selectScope(
    @Param('id') watchSourceId: string,
    @Body() body: SelectSyncScopeDto,
  ) {
    if (!body.folderId || !body.folderName) {
      throw new BadRequestException('folderId and folderName are required');
    }

    const watchSource = await this.prisma.watchSource.findUnique({
      where: { id: watchSourceId },
      include: { connection: true },
    });

    if (!watchSource) {
      throw new NotFoundException(
        `Watch source ${watchSourceId} does not exist`,
      );
    }

    await this.prisma.syncScope.deleteMany({
      where: { watchSourceId: watchSource.id },
    });
    await this.prisma.syncScope.create({
      data: {
        orgId: watchSource.connection.orgId,
        watchSourceId: watchSource.id,
        folderIdOrPrefix: body.folderId,
        includeSubfolders: body.includeSubfolders ?? true,
      },
    });

    return this.prisma.watchSource.update({
      where: { id: watchSource.id },
      data: {
        rootFolderId: body.folderId,
        externalSourceId: body.folderId,
      },
    });
  }
}
