import { Component, computed, input, output } from '@angular/core';
import { GoogleDriveBrowserItem } from '../../data-access/google-drive-sync.models';

@Component({
  selector: 'app-drive-browser',
  standalone: true,
  templateUrl: './drive-browser.component.html',
  styleUrl: './drive-browser.component.scss',
})
export class DriveBrowserComponent {
  readonly items = input<GoogleDriveBrowserItem[]>([]);
  readonly path = input<{ id: string; name: string }[]>([]);
  readonly loading = input(false);
  readonly selectedFolderId = input<string | null>(null);
  readonly savingFolderId = input<string | null>(null);
  readonly openFolder = output<GoogleDriveBrowserItem>();
  readonly goToFolder = output<string>();
  readonly selectFolder = output<GoogleDriveBrowserItem>();

  protected readonly folders = computed(() =>
    this.items().filter((item) => item.isFolder),
  );

  protected readonly files = computed(() =>
    this.items().filter((item) => !item.isFolder),
  );

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Unknown';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected fileKind(item: GoogleDriveBrowserItem): string {
    const value = item.mimeType.split('.').pop() ?? item.mimeType;
    return value.replace(/-/g, ' ');
  }
}
