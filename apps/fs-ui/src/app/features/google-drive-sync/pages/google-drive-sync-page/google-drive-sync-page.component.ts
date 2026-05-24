import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ConnectionCardComponent } from '../../components/connection-card/connection-card.component';
import { FileMetadataListComponent } from '../../components/file-metadata-list/file-metadata-list.component';
import { WatchSourceListComponent } from '../../components/watch-source-list/watch-source-list.component';
import { GoogleDriveSyncApiService } from '../../data-access/google-drive-sync-api.service';
import {
  FileMetadata,
  WatchSource,
} from '../../data-access/google-drive-sync.models';

@Component({
  selector: 'app-google-drive-sync-page',
  standalone: true,
  imports: [
    ConnectionCardComponent,
    WatchSourceListComponent,
    FileMetadataListComponent,
  ],
  templateUrl: './google-drive-sync-page.component.html',
  styleUrl: './google-drive-sync-page.component.scss',
})
export class GoogleDriveSyncPageComponent implements OnInit {
  private readonly api = inject(GoogleDriveSyncApiService);

  protected readonly orgId = signal('demo-org');
  protected readonly watchSources = signal<WatchSource[]>([]);
  protected readonly selectedWatchSourceId = signal<string | null>(null);
  protected readonly files = signal<FileMetadata[]>([]);
  protected readonly loadingSources = signal(false);
  protected readonly loadingFiles = signal(false);
  protected readonly connecting = signal(false);
  protected readonly syncingId = signal<string | null>(null);
  protected readonly downloadingId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadWatchSources();
  }

  protected async connectGoogleDrive(): Promise<void> {
    this.error.set(null);
    this.connecting.set(true);

    try {
      const response = await this.api.getOAuthUrl(this.orgId());
      window.location.assign(response.url);
    } catch (error) {
      this.error.set(
        this.toUserMessage(
          error,
          'Unable to start Google Drive connection. Check API Google OAuth configuration.',
        ),
      );
      this.connecting.set(false);
    }
  }

  protected async selectWatchSource(watchSourceId: string): Promise<void> {
    this.selectedWatchSourceId.set(watchSourceId);
    await this.loadFiles(watchSourceId);
  }

  protected async syncNow(watchSourceId: string): Promise<void> {
    this.error.set(null);
    this.syncingId.set(watchSourceId);

    try {
      await this.api.syncNow(watchSourceId);
      await this.loadFiles(watchSourceId);
    } catch (error) {
      this.error.set(
        this.toUserMessage(
          error,
          'Unable to sync this Google Drive source. Try again.',
        ),
      );
    } finally {
      this.syncingId.set(null);
    }
  }

  protected async downloadFile(fileId: string): Promise<void> {
    const watchSourceId = this.selectedWatchSourceId();

    if (!watchSourceId) {
      return;
    }

    this.error.set(null);
    this.downloadingId.set(fileId);

    try {
      await this.api.downloadFile(fileId);
      await this.loadFiles(watchSourceId);
    } catch (error) {
      this.error.set(
        this.toUserMessage(error, 'Unable to download this file. Try again.'),
      );
    } finally {
      this.downloadingId.set(null);
    }
  }

  private async loadWatchSources(): Promise<void> {
    this.error.set(null);
    this.loadingSources.set(true);

    try {
      const sources = await this.api.getWatchSources(this.orgId());
      this.watchSources.set(sources);

      if (!this.selectedWatchSourceId() && sources.length > 0) {
        await this.selectWatchSource(sources[0].id);
      }
    } catch (error) {
      this.error.set(
        this.toUserMessage(error, 'Unable to load Google Drive watch sources.'),
      );
    } finally {
      this.loadingSources.set(false);
    }
  }

  private async loadFiles(watchSourceId: string): Promise<void> {
    this.error.set(null);
    this.loadingFiles.set(true);

    try {
      this.files.set(await this.api.getFiles(watchSourceId));
    } catch (error) {
      this.files.set([]);
      this.error.set(
        this.toUserMessage(error, 'Unable to load synced file metadata.'),
      );
    } finally {
      this.loadingFiles.set(false);
    }
  }

  private toUserMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status >= 500) {
      return `${fallback} The API returned ${error.status}.`;
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return `${fallback} The API could not be reached.`;
    }

    return fallback;
  }
}
