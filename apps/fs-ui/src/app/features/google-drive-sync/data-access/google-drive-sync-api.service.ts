import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  FileMetadata,
  GoogleDriveBrowserResponse,
  Organization,
  WatchSource,
} from './google-drive-sync.models';

@Injectable({ providedIn: 'root' })
export class GoogleDriveSyncApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  createOrganization(name: string): Promise<Organization> {
    return firstValueFrom(
      this.http.post<Organization>(`${this.apiBaseUrl}/api/organizations`, {
        name,
      }),
    );
  }

  getOrganization(id: string): Promise<Organization> {
    return firstValueFrom(
      this.http.get<Organization>(`${this.apiBaseUrl}/api/organizations/${id}`),
    );
  }

  getOAuthUrl(orgId: string): Promise<{ url: string }> {
    return firstValueFrom(
      this.http.get<{ url: string }>(
        `${this.apiBaseUrl}/api/google-drive/oauth/url`,
        { params: { orgId } },
      ),
    );
  }

  getWatchSources(orgId: string): Promise<WatchSource[]> {
    return firstValueFrom(
      this.http.get<WatchSource[]>(`${this.apiBaseUrl}/api/watch-sources`, {
        params: { provider: 'google_drive', orgId },
      }),
    );
  }

  browseGoogleDrive(
    orgId: string,
    parentId?: string,
  ): Promise<GoogleDriveBrowserResponse> {
    const params: Record<string, string> = { orgId };

    if (parentId) {
      params['parentId'] = parentId;
    }

    return firstValueFrom(
      this.http.get<GoogleDriveBrowserResponse>(
        `${this.apiBaseUrl}/api/google-drive/browser`,
        { params },
      ),
    );
  }

  selectGoogleDriveScope(params: {
    watchSourceId: string;
    folderId: string;
    folderName: string;
    includeSubfolders: boolean;
  }): Promise<WatchSource> {
    return firstValueFrom(
      this.http.post<WatchSource>(
        `${this.apiBaseUrl}/api/google-drive/browser/watch-sources/${params.watchSourceId}/scope`,
        {
          folderId: params.folderId,
          folderName: params.folderName,
          includeSubfolders: params.includeSubfolders,
        },
      ),
    );
  }

  getFiles(watchSourceId: string): Promise<FileMetadata[]> {
    return firstValueFrom(
      this.http.get<FileMetadata[]>(`${this.apiBaseUrl}/api/files`, {
        params: { watchSourceId },
      }),
    );
  }

  syncNow(watchSourceId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.apiBaseUrl}/api/watch-sources/${watchSourceId}/sync-now`,
        {},
      ),
    );
  }

  downloadFile(fileId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.apiBaseUrl}/api/files/${fileId}/download`,
        {},
      ),
    );
  }
}
