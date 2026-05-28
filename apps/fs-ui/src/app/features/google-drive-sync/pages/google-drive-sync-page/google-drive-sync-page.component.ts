import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ConnectionCardComponent } from '../../components/connection-card/connection-card.component';
import { DriveBrowserComponent } from '../../components/drive-browser/drive-browser.component';
import { FileMetadataListComponent } from '../../components/file-metadata-list/file-metadata-list.component';
import { WatchSourceListComponent } from '../../components/watch-source-list/watch-source-list.component';
import { GoogleDriveSyncApiService } from '../../data-access/google-drive-sync-api.service';
import {
  FileMetadata,
  GoogleDriveBrowserItem,
  WatchSource,
} from '../../data-access/google-drive-sync.models';

@Component({
  selector: 'app-google-drive-sync-page',
  standalone: true,
  imports: [
    ConnectionCardComponent,
    DriveBrowserComponent,
    WatchSourceListComponent,
    FileMetadataListComponent,
  ],
  templateUrl: './google-drive-sync-page.component.html',
  styleUrl: './google-drive-sync-page.component.scss',
})
export class GoogleDriveSyncPageComponent implements OnInit {
  private readonly api = inject(GoogleDriveSyncApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly orgStorageKey = 'fs-sync.demoOrgId';

  protected readonly orgId = signal<string | null>(null);
  protected readonly watchSources = signal<WatchSource[]>([]);
  protected readonly selectedWatchSourceId = signal<string | null>(null);
  protected readonly files = signal<FileMetadata[]>([]);
  protected readonly driveItems = signal<GoogleDriveBrowserItem[]>([]);
  protected readonly drivePath = signal([{ id: 'root', name: 'My Drive' }]);
  protected readonly loadingSources = signal(false);
  protected readonly loadingFiles = signal(false);
  protected readonly loadingDriveItems = signal(false);
  protected readonly connecting = signal(false);
  protected readonly syncingId = signal<string | null>(null);
  protected readonly downloadingId = signal<string | null>(null);
  protected readonly savingFolderId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedRootFolderId = computed(() => {
    const selectedId = this.selectedWatchSourceId();
    return (
      this.watchSources().find((source) => source.id === selectedId)
        ?.rootFolderId ?? null
    );
  });

  ngOnInit(): void {
    void this.initializeOrganization();
  }

  protected async connectGoogleDrive(): Promise<void> {
    this.error.set(null);
    this.connecting.set(true);

    try {
      const orgId = await this.ensureOrganization();
      const response = await this.api.getOAuthUrl(orgId);
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
    await Promise.all([this.loadFiles(watchSourceId), this.loadDriveFolder()]);
  }

  protected async openDriveFolder(
    folder: GoogleDriveBrowserItem,
  ): Promise<void> {
    this.drivePath.update((path) => [
      ...path,
      { id: folder.id, name: folder.name },
    ]);
    await this.loadDriveFolder(folder.id);
  }

  protected async goToDriveFolder(folderId: string): Promise<void> {
    const index = this.drivePath().findIndex(
      (folder) => folder.id === folderId,
    );

    if (index >= 0) {
      this.drivePath.set(this.drivePath().slice(0, index + 1));
    }

    await this.loadDriveFolder(folderId);
  }

  protected async selectDriveFolder(
    folder: GoogleDriveBrowserItem,
  ): Promise<void> {
    const watchSourceId = this.selectedWatchSourceId();

    if (!watchSourceId) {
      return;
    }

    this.error.set(null);
    this.savingFolderId.set(folder.id);

    try {
      const updatedSource = await this.api.selectGoogleDriveScope({
        watchSourceId,
        folderId: folder.id,
        folderName: folder.name,
        includeSubfolders: true,
      });
      this.watchSources.update((sources) =>
        sources.map((source) =>
          source.id === updatedSource.id ? updatedSource : source,
        ),
      );
    } catch (error) {
      this.error.set(
        this.toUserMessage(error, 'Unable to save the selected Drive folder.'),
      );
    } finally {
      this.savingFolderId.set(null);
    }
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
      const orgId = await this.ensureOrganization();
      const sources = await this.api.getWatchSources(orgId);
      this.watchSources.set(sources);

      const callbackWatchSourceId =
        this.route.snapshot.queryParamMap.get('watchSourceId');
      const sourceToSelect =
        sources.find((source) => source.id === callbackWatchSourceId) ??
        sources[0];

      if (!this.selectedWatchSourceId() && sourceToSelect) {
        await this.selectWatchSource(sourceToSelect.id);
      }
    } catch (error) {
      this.error.set(
        this.toUserMessage(error, 'Unable to load Google Drive watch sources.'),
      );
    } finally {
      this.loadingSources.set(false);
    }
  }

  private async initializeOrganization(): Promise<void> {
    try {
      await this.ensureOrganization();
      await this.loadWatchSources();
    } catch (error) {
      this.error.set(
        this.toUserMessage(
          error,
          'Unable to initialize the demo organization.',
        ),
      );
    }
  }

  private async ensureOrganization(): Promise<string> {
    const currentOrgId = this.orgId();

    if (currentOrgId) {
      return currentOrgId;
    }

    const callbackOrgId = this.route.snapshot.queryParamMap.get('orgId');

    if (callbackOrgId) {
      const organization = await this.api.getOrganization(callbackOrgId);
      localStorage.setItem(this.orgStorageKey, organization.id);
      this.orgId.set(organization.id);
      return organization.id;
    }

    const storedOrgId = localStorage.getItem(this.orgStorageKey);

    if (storedOrgId) {
      try {
        const organization = await this.api.getOrganization(storedOrgId);
        this.orgId.set(organization.id);
        return organization.id;
      } catch {
        localStorage.removeItem(this.orgStorageKey);
      }
    }

    const organization = await this.api.createOrganization('Demo Organization');
    localStorage.setItem(this.orgStorageKey, organization.id);
    this.orgId.set(organization.id);
    return organization.id;
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

  private async loadDriveFolder(
    parentId = this.drivePath().at(-1)?.id,
  ): Promise<void> {
    const orgId = this.orgId();

    if (!orgId || !this.selectedWatchSourceId()) {
      this.driveItems.set([]);
      return;
    }

    this.loadingDriveItems.set(true);

    try {
      const response = await this.api.browseGoogleDrive(orgId, parentId);
      this.driveItems.set(response.items);
    } catch (error) {
      this.driveItems.set([]);
      this.error.set(
        this.toUserMessage(error, 'Unable to browse Google Drive files.'),
      );
    } finally {
      this.loadingDriveItems.set(false);
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
