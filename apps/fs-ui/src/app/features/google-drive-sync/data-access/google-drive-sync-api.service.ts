import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FileMetadata, WatchSource } from './google-drive-sync.models';

@Injectable({ providedIn: 'root' })
export class GoogleDriveSyncApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');

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
      this.http.post<void>(`${this.apiBaseUrl}/api/files/${fileId}/download`, {}),
    );
  }
}
