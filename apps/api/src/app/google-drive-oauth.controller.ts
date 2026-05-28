import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Provider } from '@prisma/client';
import {
  createSignedState,
  encryptSecret,
  optionalEnv,
  verifySignedState,
} from '@org/common';
import { PrismaService } from '@org/database';
import { GoogleDriveProviderService } from '@org/google-drive';
import { MetadataService } from '@org/metadata';
import {
  GoogleDriveOAuthCallbackResponseDto,
  OAuthUrlResponseDto,
} from './dto/api-responses.dto';

type RedirectResponse = {
  redirect(status: number, url: string): unknown;
};

@ApiTags('Google Drive OAuth')
@Controller('google-drive/oauth')
export class GoogleDriveOAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDrive: GoogleDriveProviderService,
    private readonly metadata: MetadataService,
  ) {}

  @Get('url')
  @ApiOperation({
    summary: 'Create Google Drive OAuth consent URL',
    description:
      'Returns a Google consent URL using readonly Drive scopes, offline access, and prompt=consent. The signed state carries orgId and expires after 15 minutes.',
  })
  @ApiQuery({
    name: 'orgId',
    description: 'Organization id that will own the ProviderConnection.',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @ApiOkResponse({ type: OAuthUrlResponseDto })
  @ApiBadRequestResponse({
    description: 'Missing env vars or invalid orgId/state input.',
  })
  async getOAuthUrl(@Query('orgId') orgId: string) {
    await this.assertOrganizationExists(orgId);
    const state = createSignedState(orgId);
    return { url: this.googleDrive.createOAuthUrl(state), state };
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Handle Google OAuth callback',
    description:
      'Exchanges the OAuth code for tokens, stores encrypted credentials, calls changes.getStartPageToken, creates a WatchSource, registers changes.watch, and stores channel metadata.',
  })
  @ApiQuery({
    name: 'code',
    description: 'OAuth authorization code returned by Google.',
  })
  @ApiQuery({
    name: 'state',
    description: 'Signed state returned from the OAuth URL endpoint.',
  })
  @ApiOkResponse({ type: GoogleDriveOAuthCallbackResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid/expired state, missing code, or Google token exchange failure.',
  })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: RedirectResponse,
  ) {
    if (!code) {
      throw new BadRequestException('Missing Google OAuth code');
    }
    if (!state) {
      throw new BadRequestException('Missing Google OAuth state');
    }

    const verifiedState = verifySignedState(state);
    await this.assertOrganizationExists(verifiedState.orgId);
    const tokens = await this.googleDrive.exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      throw new Error('Google OAuth callback did not include an access token');
    }

    const connection = await this.prisma.providerConnection.create({
      data: {
        orgId: verifiedState.orgId,
        provider: Provider.google_drive,
        name: 'Google Drive',
        credentialsRef: 'database-encrypted',
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : null,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });

    const pageToken = await this.googleDrive.getStartPageToken(connection.id);
    const watchSource = await this.prisma.watchSource.create({
      data: {
        connectionId: connection.id,
        provider: Provider.google_drive,
        sourceType: 'user_drive',
        externalSourceId: 'me',
        pageToken,
      },
    });

    await this.importInitialMetadata(verifiedState.orgId, connection.id, watchSource.id);

    const updatedWatchSource = await this.registerWatchIfEnabled(
      connection.id,
      watchSource.id,
    );

    const appOrigin = optionalEnv('APP_ORIGIN', 'http://localhost:4200').replace(
      /\/$/,
      '',
    );

    return response.redirect(
      302,
      `${appOrigin}/google-drive-sync?connected=google-drive&orgId=${verifiedState.orgId}&watchSourceId=${updatedWatchSource.id}`,
    );
  }

  private async importInitialMetadata(
    orgId: string,
    connectionId: string,
    watchSourceId: string,
  ): Promise<void> {
    let pageToken: string | undefined;
    const maxPages = Number(optionalEnv('GOOGLE_DRIVE_INITIAL_FILES_MAX_PAGES', '5'));

    for (let page = 0; page < maxPages; page += 1) {
      const response = await this.googleDrive.listFiles(connectionId, pageToken);

      for (const file of response.files ?? []) {
        const normalized = this.googleDrive.normalizeFile(file);
        await this.metadata.upsertGoogleDriveFile({
          orgId,
          watchSourceId,
          file: normalized,
        });
      }

      if (!response.nextPageToken) {
        return;
      }

      pageToken = response.nextPageToken;
    }
  }

  private async registerWatchIfEnabled(connectionId: string, watchSourceId: string) {
    if (optionalEnv('GOOGLE_DRIVE_ENABLE_WEBHOOKS', 'false') !== 'true') {
      return this.prisma.watchSource.findUniqueOrThrow({
        where: { id: watchSourceId },
      });
    }

    const channel = await this.googleDrive.watchChanges(connectionId, watchSourceId);
    return this.prisma.watchSource.update({
      where: { id: watchSourceId },
      data: {
        channelId: channel.channelId,
        resourceId: channel.resourceId,
        channelToken: channel.channelToken,
        expiresAt: channel.expiresAt,
      },
    });
  }

  private async assertOrganizationExists(orgId: string): Promise<void> {
    if (!orgId) {
      throw new BadRequestException('Missing orgId');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });

    if (!organization) {
      throw new BadRequestException(
        `Organization ${orgId} does not exist. Create an organization before connecting Google Drive.`,
      );
    }
  }
}
