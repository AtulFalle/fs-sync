import { Component, input, output } from '@angular/core';
import { WatchSource } from '../../data-access/google-drive-sync.models';
import { SyncStatusPillComponent } from '../sync-status-pill/sync-status-pill.component';

@Component({
  selector: 'app-watch-source-list',
  standalone: true,
  imports: [SyncStatusPillComponent],
  templateUrl: './watch-source-list.component.html',
  styleUrl: './watch-source-list.component.scss',
})
export class WatchSourceListComponent {
  readonly sources = input<WatchSource[]>([]);
  readonly selectedWatchSourceId = input<string | null>(null);
  readonly syncingId = input<string | null>(null);
  readonly selectSource = output<string>();
  readonly syncNow = output<string>();

  protected sourceTypeLabel(sourceType: WatchSource['sourceType']): string {
    return sourceType.replace(/_/g, ' ');
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'No expiration';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
