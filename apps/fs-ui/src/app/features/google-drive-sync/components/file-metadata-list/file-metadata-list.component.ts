import { Component, input, output } from '@angular/core';
import { FileMetadata } from '../../data-access/google-drive-sync.models';
import { SyncStatusPillComponent } from '../sync-status-pill/sync-status-pill.component';

@Component({
  selector: 'app-file-metadata-list',
  standalone: true,
  imports: [SyncStatusPillComponent],
  templateUrl: './file-metadata-list.component.html',
  styleUrl: './file-metadata-list.component.scss',
})
export class FileMetadataListComponent {
  readonly files = input<FileMetadata[]>([]);
  readonly loading = input(false);
  readonly selectedWatchSourceId = input<string | null>(null);
  readonly downloadingId = input<string | null>(null);
  readonly downloadFile = output<string>();

  protected displayType(file: FileMetadata): string {
    if (file.isFolder) {
      return 'Folder';
    }

    return file.mimeType ?? 'File';
  }

  protected formatSize(sizeBytes?: number | null): string {
    if (sizeBytes === null || sizeBytes === undefined) {
      return '-';
    }

    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = sizeBytes / 1024;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size = size / 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
