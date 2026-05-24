import { Controller, Get, Query } from '@nestjs/common';
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
  verifySignedState,
} from '@org/common';
import { PrismaService } from '@org/database';
import { GoogleDriveProviderService } from '@org/google-drive';
import {
  GoogleDriveOAuthCallbackResponseDto,
  OAuthUrlResponseDto,
} from './dto/api-responses.dto';

@ApiTags('Google Drive OAuth')
@Controller('google-drive/oauth')
export class GoogleDriveOAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleDrive: GoogleDriveProviderService,
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
  getOAuthUrl(@Query('orgId') orgId: string) {
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
  async callback(@Query('code') code: string, @Query('state') state: string) {
    const verifiedState = verifySignedState(state);
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

    const channel = await this.googleDrive.watchChanges(
      connection.id,
      watchSource.id,
    );
    const updatedWatchSource = await this.prisma.watchSource.update({
      where: { id: watchSource.id },
      data: {
        channelId: channel.channelId,
        resourceId: channel.resourceId,
        channelToken: channel.channelToken,
        expiresAt: channel.expiresAt,
      },
    });

    return {
      connectionId: connection.id,
      watchSourceId: updatedWatchSource.id,
      expiresAt: updatedWatchSource.expiresAt,
    };
  }
}
